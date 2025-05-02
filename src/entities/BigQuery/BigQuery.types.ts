import { BigQuery as BigQueryClass } from '@google-cloud/bigquery';
import { Bucket } from '@google-cloud/storage';

export type BigQuery = BigQueryClass & {
  /** Initialize the BigQuery service */
  init: () => void;
  /** Shutdown the BigQuery service */
  shutdown: () => Promise<void>;
  /** Get the associated GCS bucket if available */
  getBucket: () => Bucket | undefined;
};