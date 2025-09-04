import { Request, Response, NextFunction } from 'express';
import { EngineError } from 'entities/EngineError';
import { reportDebug } from 'utils';
import { tlsRequest } from 'utils/tlsRequest';

const namespace = 'engine:middleware:userResolver';

/** Fetch the user previously identified by a JWT and adds his data to the request.user object */
export async function userResolver(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  const id = request.user?.id;
  if (!id)
    throw new EngineError({
      message: 'Could not resolve user as the request is missing his ID'
    });
  const user = await getUserById(id);
  if (!user)
    throw new EngineError({
      message: 'Could not resolve user as it could not be fetched',
      data: { id }
    });
  reportDebug({
    namespace,
    message: 'Resolved user based on his token',
    data: { user, request: request.user }
  });
  request.user = {
    ...request?.user,
    ...user
  };

  next();
}

/**
 * Call the GET /user/{id} endpoint using TLS
 */
export async function getUserById(userId: number): Promise<unknown> {
  const userServiceUrl = process.env.USER_SERVICE_URL;
  if (!userServiceUrl) {
    throw new Error('USER_SERVICE_URL is not defined in environment variables');
  }

  const response = await tlsRequest<unknown>({
    method: 'GET',
    url: `${userServiceUrl}/${userId}`
  });

  return response.data;
}
