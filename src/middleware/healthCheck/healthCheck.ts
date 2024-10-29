import { Router, Request, Response } from 'express';

/**
 * respond to Kubernetes health-checks with 200
 */
export function healthCheck(path = '/heartbeat'): Router {
  return Router()
    .get('/', (req: Request, res: Response) => {
      res.sendStatus(200);
    })
    .get(path, (req: Request, res: Response) => {
      res.sendStatus(200);
    });
}
