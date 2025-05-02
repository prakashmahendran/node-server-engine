import { BigQuery as BigQueryClass } from '@google-cloud/bigquery';
import { Storage, Bucket } from '@google-cloud/storage';
import config, { storage, bucketName } from './BigQuery.config';
import { validateBigQueryEnvironment } from './BigQuery.validate';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';
import { BigQuery as BigQueryInterface } from './BigQuery.types';

export let bigQueryClient: undefined | BigQueryClass;
let gcsBucket: undefined | Bucket;

/**
 * We use a proxy to extend the BigQuery behavior and allow initialization of the client only when needed while keeping the same interface
 */
export const bigquery = new Proxy<BigQueryInterface>(
  // Due to how we do the proxying, we are forced to ignore ts-errors
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {},
  {
    get: function (target, property: string): unknown {
      if (property === 'init') return init;
      if (property === 'shutdown') return shutdown;
      if (property === 'getBucket') return getBucket;
      
      // Create the BigQuery client if it does not exist
      if (!bigQueryClient) {
        throw new EngineError({
          message: 'BigQuery client was not initialized'
        });
      }
      
      // Call the function on the BigQuery client or return the property
      const value = bigQueryClient[property as keyof BigQueryClass];
      return typeof value === 'function' ? value.bind(bigQueryClient) : value;
    }
  }
);

/** Initialize BigQuery client and optionally the GCS bucket */
export function init(): void {
  // Ignore if already initialized
  if (bigQueryClient) return;
  
  validateBigQueryEnvironment();
  bigQueryClient = config;

  if (storage && bucketName) {
    gcsBucket = storage.bucket(bucketName);
    console.log(`GCS bucket "${bucketName}" initialized.`);
  } else {
    console.warn('GCS not configured. Skipping bucket setup.');
  }

  console.log('BigQuery client initialized.');
  LifecycleController.register(bigquery);
}

/** On shutdown, clear client and bucket references */
export async function shutdown(): Promise<void> {
  bigQueryClient = undefined;
  gcsBucket = undefined;
  console.log('BigQuery client shut down.');
}

/** Access the configured GCS bucket if available */
export function getBucket(): Bucket | undefined {
  return gcsBucket;
}