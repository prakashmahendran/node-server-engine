import { TLSSocket } from 'tls';
import { Request, Response, NextFunction } from 'express';
import { EndpointAuthParams, EndpointAuthType } from 'entities/Endpoint';
import { WebError } from 'entities/WebError';
import { assertEnvironment } from 'utils/checkEnvironment';
import { envAssert } from 'utils/envAssert';
import { reportDebug } from 'utils/report';
import {} from './authTls.types';

const namespace = 'engine:middleware:authTls';

/**
 * Returns a middleware for TLS authentication
 * Both client and server must have a certificate signed by the same CA
 * Host name of the client is added to the express request object under 'request.user.host'
 * A limited number of hosts can be specified with the environment variable ALLOWED_CLIENT_HOSTS
 * @param {Object} options
 * @param {Array<String>} options.whitelist - List of certificate Common Name or Alt Name that are permitted to make requests to this endpoint
 * @return {Function}
 */
export function authTls(
  options: EndpointAuthParams<EndpointAuthType.TLS> = {}
): (request: Request, response: Response, next: NextFunction) => void {
  assertEnvironment({
    TLS_SERVER_KEY: envAssert.isPath(),
    TLS_SERVER_CERT: envAssert.isPath()
  });

  return (request: Request, response: Response, next: NextFunction): void => {
    authTlsMiddleware(request, response, next, options);
  };
}

let allowedClientHosts: Array<string> = [];

/** Load TLS auth related environment variables */
export function loadEnv(): void {
  if (process.env.ALLOWED_CLIENT_HOSTS) {
    assertEnvironment({ ALLOWED_CLIENT_HOSTS: envAssert.isHostList() });
    allowedClientHosts = process.env.ALLOWED_CLIENT_HOSTS.split(',').map(
      (value) => value.trim()
    );
  } else {
    allowedClientHosts = [];
  }
}

loadEnv();

/** Middleware that handles mTLS based authentication */
export function authTlsMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
  options: EndpointAuthParams<EndpointAuthType.TLS> = {}
): void {
  const socket = request.socket as TLSSocket;

  reportDebug({
    namespace,
    message: 'TLS socket auth state',
    data: {
      authorized: socket?.authorized,
      authorizationError: (
        socket as TLSSocket & { authorizationError?: string }
      )?.authorizationError,
      peerCert: socket?.getPeerCertificate?.()
    }
  });

  // Check if the client's tls certificate is valid
  if (!socket?.authorized) {
    throw new WebError({
      errorCode: 'unauthorized',
      statusCode: 401,
      message: 'TLS certificate could not be validated'
    });
  }

  // Extract the subjects for the client certificate
  const clientCertificate = socket.getPeerCertificate();
  const subjects = [];
  if (clientCertificate.subject.CN) subjects.push(clientCertificate.subject.CN);
  if (clientCertificate.subjectaltname?.length) {
    const altNames = clientCertificate.subjectaltname
      .split(',')
      .map((subject) => subject.trim())
      .map((value) => value.split(':')[1]);
    subjects.push(...altNames);
  }

  const whitelist = options.whitelist ?? allowedClientHosts;
  reportDebug({
    namespace,
    message: 'Performing TLS authentication',
    data: { certificate: clientCertificate, whitelist, subjects }
  });
  // Check that the subject is authorized
  if (whitelist?.length) {
    let allowed = false;
    for (const subject of subjects) {
      if (whitelist.includes(subject)) {
        allowed = true;
        break;
      }
    }
    // Throw error if there is no subject in the whitelist
    if (!allowed)
      throw new WebError({
        errorCode: 'unauthorized',
        statusCode: 401,
        message: 'Client host is not in the whitelist',
        data: { subjects }
      });
  }
  // Pas subjects down
  request.hosts = subjects;
  next();
}
