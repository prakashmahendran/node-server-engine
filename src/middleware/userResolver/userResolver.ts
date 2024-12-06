import { Request, Response, NextFunction } from 'express';
import { EngineError } from 'entities/EngineError';
import { reportDebug } from 'utils';

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
  const user = { user: 'ram', id };
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
