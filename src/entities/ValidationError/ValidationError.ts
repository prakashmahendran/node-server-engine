import {
  ValidationError as ExpressValidationError,
  Result
} from 'express-validator';
import { LogSeverity } from 'const';
import { EngineError } from 'entities/EngineError';
import { WebError } from 'entities/WebError';

/** Error class for request/message validation errors */
export class ValidationError extends WebError {
  /** Create an ValidationError this represents errors in parsing incoming messages/requests */
  public constructor(validationResult: Result<ExpressValidationError>) {
    if (validationResult.isEmpty())
      throw new EngineError({
        message:
          'Attempted to create a validation error while validation was successful'
      });

    const errors = validationResult.array();
    // Hint that is sent to the client as logged as data
    const hint = errors.reduce(
      (hint, error) => ({ ...hint, [error.type]: error.msg as string }),
      {}
    );
    super({
      message: 'Request did not pass validation',
      errorCode: 'invalid-request',
      statusCode: 400,
      severity: LogSeverity.WARNING,
      data: hint,
      hint
    });
  }
}
