import { Request, Response, NextFunction } from 'express';
import {
  checkSchema,
  validationResult,
  Schema,
  ValidationChain
} from 'express-validator';
import { ValidationError } from 'entities/ValidationError';

/** Validate the express-validator results */
export const validate = (
  config: Schema
): Array<
  ValidationChain | ((req: Request, res: Response, next: NextFunction) => void)
> => [
  ...checkSchema(config),
  (req: Request, res: Response, next: NextFunction): void => {
    const result = validationResult(req);
    if (result.isEmpty()) {
      next();
      return;
    }
    next(new ValidationError(result));
  }
];
