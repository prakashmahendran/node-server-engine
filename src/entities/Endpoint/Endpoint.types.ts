/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ErrorRequestHandler,
  Request,
  Response,
  NextFunction,
  RequestHandler
} from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { Schema } from 'express-validator';
import { ParsedQs } from 'qs';

import {
  authJwt,
  authHmac,
  authTls,
  authStatic,
  authAdmin,
  FileUploaderConfig,
  RequestAdminProps
} from 'middleware';

export enum EndpointMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  PATCH = 'patch',
  DELETE = 'delete',
  HEAD = 'head',
  ALL = 'all'
}

export const EndpointMethods = Object.values(EndpointMethod);

export enum EndpointAuthType {
  NONE = 'none',
  JWT = 'jwt',
  TLS = 'tls',
  HMAC = 'hmac',
  STATIC = 'static',
  ADMIN = 'admin'
}

export const EndpointAuthTypes = Object.values(EndpointAuthType);

export type Middleware<T extends EndpointAuthType> = (
  request: EndpointRequestType[T],
  response: Response,
  next: NextFunction
) => unknown | Promise<unknown>;

export type MiddlewareChainElement<T extends EndpointAuthType> =
  | Array<Middleware<T>>
  | Middleware<T>
  | any;

/** Auth related parameters used with Admin authentication  */
interface EndpointAuthAdminParams {
  /** [Admin] User permission required to use this endpoint */
  permission: string;
}

/** Auth related parameters used with HMAC authentication  */
interface EndpointAuthHmacParams {
  /** [HMAC] Secret used for signature */
  secret?: string;
  /** [HMAC] For Github webhook, the standard differs slightly, so this option must be selected */
  isGithub?: boolean;
}

/** Auth related parameters used with mTLS authentication  */
interface EndpointAuthTlsParams {
  /** [TLS] List oh hosts that are allowed to use the endpoint, this is compared to the claims in the certificate */
  whitelist?: Array<string>;
}

/** Mapping used to get auth specific parameters depending on the auth type used  */
interface EndpointAuthSpecificParams {
  /** Auth parameters for no authentication */
  [EndpointAuthType.NONE]: any;
  /** Auth parameters for JWT authentication */
  [EndpointAuthType.JWT]: any;
  /** Auth parameters for mTLS authentication */
  [EndpointAuthType.TLS]: EndpointAuthTlsParams;
  /** Auth parameters for HMAC authentication */
  [EndpointAuthType.HMAC]: EndpointAuthHmacParams;
  /** Auth parameters for static authentication */
  [EndpointAuthType.STATIC]: any;
  /** Auth parameters for admin token authentication */
  [EndpointAuthType.ADMIN]: EndpointAuthAdminParams;
}

export type EndpointAuthParams<T extends EndpointAuthType> =
  EndpointAuthSpecificParams[T] & {
    /** This will allow the business logic to run event if the authentication fails */
    acceptInvalid?: boolean;
  };

export type EndpointAuthHandler<T extends EndpointAuthType> = (
  options?: EndpointAuthParams<T>
) => (
  request: Request,
  response: Response,
  next: NextFunction
) => void | Promise<void>;

export const EndpointAuthHandlers = {
  /** Auth handler for no authentication */
  [EndpointAuthType.NONE]: undefined,
  /** Auth handler for JWT authentication */
  [EndpointAuthType.JWT]: authJwt,
  /** Auth handler for mTLS authentication */
  [EndpointAuthType.TLS]: authTls,
  /** Auth handler for HMAC authentication */
  [EndpointAuthType.HMAC]: authHmac,
  /** Auth handler for static authentication */
  [EndpointAuthType.STATIC]: authStatic,
  /** Auth handler for admin token authentication */
  [EndpointAuthType.ADMIN]: authAdmin
};

export type EndpointHandler<T extends EndpointAuthType> = (
  request: EndpointRequestType[T],
  response: Response
) => void | Promise<void>;

/** Endpoint initialization options */
export interface EndpointOptions<T extends EndpointAuthType> {
  /** Path at which the endpoint is reachable */
  path: string;
  /** HTTP method of the endpoint */
  method: EndpointMethod;
  /** Function handling the endpoint's business logic */
  handler: EndpointHandler<T>;
  /** Validation schema that the request must pass before reaching the handler */
  validator: Schema;
  /** Authentication system required by this endpoint */
  authType: T;
  /** Authentication related options for this endpoint */
  authParams?: EndpointAuthParams<T>;
  /** @deprecated Setting to upload a file through this endpoint */
  file?: FileUploaderConfig;
  /** Settings to upload files through this endpoint (this will automatically switch the expected request to be a multipart) */
  files?: Array<FileUploaderConfig>;
  /** Express request handlers that should run on this endpoint before the business logic, they will run after the global middleware */
  middleware?: MiddlewareChainElement<T>;
  /** Express error handlers that should be registered for this endpoint. they will run before the global error handler */
  errorMiddleware?: ErrorRequestHandler | Array<ErrorRequestHandler>;
}

/** Request type when using JWT authentication */
export interface JwtRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  /** User that identified using a JWT */
  user: Record<string, any> | any;
}

/** Request type when using mTLS authentication */
export interface TlsRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  /** Host names provided by the mTLS authenticated client */
  hosts: Array<string>;
}

/** Request type when using HMAC authentication */
export interface AdminRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  /** User that identified using a JWT */
  admin: RequestAdminProps;
}

/** Mapping of request types in endpoints based on auth type used */
export interface EndpointRequestType {
  /** Request type for no authentication */
  [EndpointAuthType.NONE]: Request;
  /** Request type when using JWT authentication */
  [EndpointAuthType.JWT]: JwtRequest;
  /** Request type when using mTLS authentication */
  [EndpointAuthType.TLS]: TlsRequest;
  /** Request type when using HMAC authentication */
  [EndpointAuthType.HMAC]: Request;
  /** Auth handler for static authentication */
  [EndpointAuthType.STATIC]: Request;
  /** Auth handler for admin token authentication */
  [EndpointAuthType.ADMIN]: AdminRequest;
}

export type SafeMiddleWareChain = Array<
  RequestHandler | ErrorRequestHandler | SafeMiddleWareChain
>;
