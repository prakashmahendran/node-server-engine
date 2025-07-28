import { EngineError } from 'entities/EngineError';

/**
 * Validates that the required environment variables for BigQuery are present
 * @throws {EngineError} If any required environment variable is missing
 */
export function validateBigQueryEnvironment(): void {
  // Check for required environment variables
  if (!process.env.PROJECT_ID) {
    throw new EngineError({
      message: 'Missing environment variable: PROJECT_ID'
    });
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new EngineError({
      message: 'Missing environment variable: GOOGLE_APPLICATION_CREDENTIALS'
    });
  }

  // Note: GCS-related variables (like BUCKET_NAME) are completely optional
}