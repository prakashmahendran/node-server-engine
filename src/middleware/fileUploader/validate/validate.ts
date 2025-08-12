/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request } from 'express';
import { Schema } from 'express-validator';
import { validate as validateMiddleware } from 'middleware/validate';

/** Validate a schema against a request using our validation middleware */
export async function validate(
  request: Request,

  schema: Schema
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Generate a validation chain using our middleware
    const validationChain = validateMiddleware(schema).flat();
    if (!validationChain.length) resolve();
    // Recursively go through each middleware by imitating the next function from express
    let position = -1;
    const next = (error?: unknown): void => {
      if (error) reject(error);
      position++;
      if (position === validationChain.length) {
        resolve();
        return;
      }
      (validationChain[position] as any)(request, undefined, next);
    };
    next();
  });
}
