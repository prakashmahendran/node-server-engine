import { Request, Response, NextFunction } from 'express';
import { TokenIssuer } from 'const';
import { EndpointAuthParams, EndpointAuthType } from 'entities/Endpoint';
import { EngineError } from 'entities/EngineError';
import { WebError } from 'entities/WebError';
import { reportDebug, jwtVerify } from 'utils';
import {} from './authAdmin.types';

const namespace = 'engine:middleware:authAdmin';

/** Generate a middleware to authenticate the client connection with a Admin api */
export function authAdmin(
  options: EndpointAuthParams<EndpointAuthType.ADMIN>
): (request: Request, response: Response, next: NextFunction) => Promise<void> {
  if (!options.permission)
    throw new EngineError({
      message: 'Endpoint using admin auth type must specify permission'
    });
  return async (
    request: Request,
    response: Response,
    next: NextFunction
  ): Promise<void> => {
    const [scheme, credentials] =
      request.headers?.authorization?.split(' ') ?? [];
    // No bearer token has been sent
    if (!credentials || scheme.toLowerCase() !== 'bearer') {
      throw new WebError({
        errorCode: 'unauthorized',
        statusCode: 401,
        message: 'No bearer token found',
        data: { authorization: request.headers?.authorization }
      });
    }
    reportDebug({
      namespace,
      message: 'Performing JWT authentication',
      data: { scheme, credentials }
    });
    // Verify token and extract its payload
    const payload = await jwtVerify(credentials, TokenIssuer.ADMIN_API);
    reportDebug({
      namespace,
      message: 'Extracted user data from JWT',
      data: { payload, credentials }
    });

    if (!payload.per)
      throw new WebError({
        errorCode: 'unauthorized',
        statusCode: 401,
        message: `User token does not contain any permission claim`
      });

    // User Permission
    const permissions = payload.per;
    const userPermissions =
      permissions instanceof Array ? permissions : [permissions];

    reportDebug({
      namespace,
      message: 'Performing Admin Permission check',
      data: {
        permissions,
        endpointPermission: options.permission,
        adminPermissions: userPermissions
      }
    });

    if (!checkUserPermissions(userPermissions, options.permission)) {
      throw new WebError({
        errorCode: 'unauthorized',
        statusCode: 401,
        message: `User does not have required permission "${options.permission}"`,
        data: { userPermissions }
      });
    }

    // The user object on the request is hydrated with data from the token
    request.admin = {
      ...request.admin,
      email: payload.sub,
      permissions: userPermissions
    };

    next();
  };
}

/** */
function checkUserPermissions(
  userPermissions: Array<string>,
  endpointPermission: string
): boolean {
  const endpointPermissionParts = endpointPermission.split(':');
  userPermissionLoop: for (const permission of userPermissions) {
    const permissionParts = permission.split(':');

    // Ignore if both are not same length
    if (permissionParts.length !== endpointPermissionParts.length)
      continue userPermissionLoop;

    for (let i = 0; i < permissionParts.length; i++) {
      // Wildcards get automatic validation, otherwise it must match with the same part of the endpoint permission
      if (
        permissionParts[i] !== '*' &&
        permissionParts[i] !== endpointPermissionParts[i]
      )
        continue userPermissionLoop;
    }
    return true;
  }
  return false;
}
