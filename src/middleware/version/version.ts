import { Router, Request, Response } from 'express';
import { version as engineVersion } from '../../../package.json';

/**
 * Path returning the version of the service
 * @return {Router}
 */
export function version(): Router {
  return Router().use('/version', (req: Request, res: Response) => {
    res.json({ version: process.env.BUILD_ID, engineVersion });
  });
}
