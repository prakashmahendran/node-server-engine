import { assertEnvironment } from 'utils/checkEnvironment';
import { envAssert } from 'utils/envAssert';

/**
 * Verify that the environment variables to connect to a SQL server are properly set
 */
export function validateSequelizeEnvironment(): void {
  // We only check if there is at least the host specified
  if (process.env.SQL_HOST) assertEnvironment({ SQL_HOST: envAssert.isHost() });
  if (process.env.SQL_PASSWORD)
    assertEnvironment({ SQL_PASSWORD: envAssert.isString() });
  if (process.env.SQL_DB) assertEnvironment({ SQL_DB: envAssert.isString() });
  if (process.env.SQL_USER)
    assertEnvironment({ SQL_USER: envAssert.isString() });
}
