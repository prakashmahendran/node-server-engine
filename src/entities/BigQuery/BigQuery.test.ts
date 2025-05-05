import { expect } from 'chai';
import { validateBigQueryEnvironment } from './BigQuery.validate';

describe('Entity - BigQuery', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  it('Should validate process env with required BigQuery variables', () => {
    process.env.PROJECT_ID = 'test-project';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/credentials.json';
    expect(validateBigQueryEnvironment).not.to.throw();
  });

  it('Should work with optional GCS bucket configuration', () => {
    process.env.PROJECT_ID = 'test-project';
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/credentials.json';
    process.env.BUCKET_NAME = 'test-bucket';
    expect(validateBigQueryEnvironment).not.to.throw();
  });

  it('Should fail if PROJECT_ID is missing', () => {
    delete process.env.PROJECT_ID;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/credentials.json';
    expect(validateBigQueryEnvironment).to.throw(/PROJECT_ID/);
  });

  it('Should fail if GOOGLE_APPLICATION_CREDENTIALS is missing', () => {
    process.env.PROJECT_ID = 'test-project';
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    expect(validateBigQueryEnvironment).to.throw(/GOOGLE_APPLICATION_CREDENTIALS/);
  });
});