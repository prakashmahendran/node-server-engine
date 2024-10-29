import { Client } from '@elastic/elasticsearch';

/** Represents a migration that should be executed on ElasticSearch */
export interface ElasticSearchMigration {
  /** Migration function */
  migrate: (client: Client) => Promise<void>;
}
