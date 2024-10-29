import { Router, Request, Response } from 'express';
import { instanceRegistry, serviceRegistry } from 'const/metrics';
import { reportError } from 'utils/report';

/** Middleware that calculates request time, and exposes metrics related to requests processed by this service */
export function metrics(): Router {
  return Router()
    .use('/metrics/instance', (req: Request, res: Response) => {
      (async (): Promise<void> => {
        res.set('Content-Type', instanceRegistry.contentType);
        res.end(await instanceRegistry.metrics());
      })().catch((error: Error) => {
        reportError(error);
      });
    })
    .use('/metrics/service', (req: Request, res: Response) => {
      (async (): Promise<void> => {
        res.set('Content-Type', serviceRegistry.contentType);
        res.end(await serviceRegistry.metrics());
      })().catch((error: Error) => {
        reportError(error);
      });
    });
}
