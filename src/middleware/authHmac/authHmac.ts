import { BinaryToTextEncoding } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { HmacPayload } from './authHmac.types';
import { EndpointAuthParams, EndpointAuthType } from 'entities/Endpoint';
import { WebError } from 'entities/WebError';
import { verifySignature } from 'utils/hmac';
import { reportDebug } from 'utils/report';

const namespace = 'engine:middleware:authHmac';

/** Generate an HMAC authentication middleware */
export function authHmac(
  options: EndpointAuthParams<EndpointAuthType.HMAC> = {}
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const payload = (
      req.method === 'GET' ? req.query : req.body
    ) as HmacPayload;
    let signature: string | undefined;
    let signatureSettings;
    if (options.isGithub) {
      // For GitHub, the signature is in the header and is has specific settings
      signature =
        req.headers['x-hub-signature'] &&
        (req.headers['x-hub-signature'] as string).substr(5);
      signatureSettings = {
        algorithm: 'sha1',
        sort: false,
        encode: 'hex' as BinaryToTextEncoding
      };
    } else {
      // In our standard authentication, the signature is included in the payload
      signature = payload.signature;
      delete payload.signature;
    }
    const settings = { secret: options.secret, ...signatureSettings };
    if (!signature)
      throw new WebError({
        message: 'No signature was provided',
        errorCode: 'unauthorized',
        statusCode: 401
      });
    reportDebug({
      namespace,
      message: 'Performing HMAC authentication',
      data: { payload, signature, settings }
    });
    if (!verifySignature(payload, signature, settings))
      throw new WebError({
        message: 'Signature does not match hmac of payload',
        errorCode: 'unauthorized',
        statusCode: 401
      });
    next();
  };
}
