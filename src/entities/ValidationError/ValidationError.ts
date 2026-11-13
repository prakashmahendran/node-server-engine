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
    // Which fields failed and why, so a client can point at them. The submitted values are left out.
    const details = errors.map((error) =>
      error.type === 'field'
        ? {
            field: error.path,
            location: error.location,
            message: error.msg as string
          }
        : { message: error.msg as string }
    );
    super({
      message: 'Request did not pass validation',
      errorCode: 'invalid-request',
      statusCode: 400,
      severity: LogSeverity.WARNING,
      data: hint,
      hint,
      details
    });
  }
}
