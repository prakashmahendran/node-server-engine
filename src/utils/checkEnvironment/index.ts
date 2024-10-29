import { cleanEnv, ReporterOptions } from 'envalid';
import { EngineError } from 'entities/EngineError';
import { reportError } from 'utils/report';

/**
 * Create an Envalid reporter
 * @param shouldExit - should the reporter exit the process on fail
 * @return Envalid reporter function
 */
function createReporter(shouldExit: boolean) {
  return (reporter: ReporterOptions<unknown>): void => {
    const { errors } = reporter;
    const failedChecks = Object.keys(errors);
    const message = failedChecks.join(', ');
    if (failedChecks.length == 0) return;
    if (shouldExit) {
      reportError(
        new EngineError({
          message: `Check Environment Failed:  ${message}`,
          data: failedChecks
        })
      );
      process.exit(1);
    }
    throw new EngineError({
      message: `Check Environment Failed:  ${message}`,
      data: failedChecks
    });
  };
}

/**
 * Ensure the process.env is valid using Envalid.
 * if the validation fails it will log a helpful EngineError.emergency()
 * and exit the process with status-code 1.
 * @param validators - Envalid validators
 */
export function checkEnvironment(validators = {}): void {
  cleanEnv(process.env, validators, { reporter: createReporter(true) });
}

/**
 * Ensure the process.env is valid using Envalid.
 * if the validation fails it will throw a EngineError.emergency()
 * @param validators - Envalid validators
 */
export function assertEnvironment(validators = {}): void {
  cleanEnv({ ...process.env }, validators, { reporter: createReporter(false) });
}
