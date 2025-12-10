import { readdirSync } from 'fs';
import path from 'path';
import { Client, ClientOptions } from '@elastic/elasticsearch';
import { ElasticSearchMigration } from './ElasticSearch.types';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';
import { envAssert, reportError, reportInfo, reportDebug } from 'utils';
import { checkEnvironment } from 'utils/checkEnvironment';

const namespace = 'engine:elasticsearch';

/** Elastic search client */
let client: undefined | Client;

export const ElasticSearch = {
  /**
   * Init function that should be called on server startup to establish the connection
   */
  async init(): Promise<void> {
    checkEnvironment({
      ELASTIC_SEARCH_HOST: envAssert.isString(),
      ELASTIC_SEARCH_USERNAME: envAssert.isString(),
      ELASTIC_SEARCH_PASSWORD: envAssert.isString(),
      ELASTIC_SEARCH_MIGRATION_PATH: envAssert.isString()
    });

    if (!process.env.ELASTIC_SEARCH_HOST)
      throw new EngineError({
        message: 'ElasticSearch Host not set in environment'
      });

    reportDebug({
      namespace,
      message: 'Initializing ElasticSearch client',
      data: { host: process.env.ELASTIC_SEARCH_HOST }
    });

    const config: ClientOptions = {
      node: process.env.ELASTIC_SEARCH_HOST,
      auth: {
        username: process.env.ELASTIC_SEARCH_USERNAME as string,
        password: process.env.ELASTIC_SEARCH_PASSWORD as string
      },
      maxRetries: 3,
      requestTimeout: 30000,
      sniffOnStart: false
    };

    // Add TLS configuration if TLS_CA is provided
    if (process.env.TLS_CA) {
      config.tls = {
        ca: process.env.TLS_CA,
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      };
      reportDebug({
        namespace,
        message: 'TLS enabled for ElasticSearch connection'
      });
    }

    client = new Client(config);

    // Verify connection
    try {
      await client.ping();
      reportDebug({
        namespace,
        message: 'ElasticSearch connection established'
      });
    } catch (error) {
      throw new EngineError({
        message: 'Failed to connect to ElasticSearch',
        data: { error: (error as Error).message }
      });
    }

    // In test environment flush the database before running migrations
    if (process.env.NODE_ENV === 'test') {
      reportDebug({
        namespace,
        message: 'Test environment detected, flushing all indices'
      });
      await client.indices.delete({ index: '*' });
    }

    await this.migrate();
    LifecycleController.register(this);

    reportInfo({ message: 'ElasticSearch initialized successfully' });
  },

  /**
   * Get the ElasticSearch client (for advanced use cases)
   */
  getClient(): Client | undefined {
    return client;
  },

  /**
   * Migration function called during the init process
   * Manages the database structure
   */
  async migrate(): Promise<void> {
    if (!client) throw new EngineError({ message: 'ElasticSearch was not initialized' });

    reportDebug({
      namespace,
      message: 'Starting ElasticSearch migrations'
    });

    const migrationPath = path.resolve(
      process.env.ELASTIC_SEARCH_MIGRATION_PATH as string
    );

    let files: string[];
    try {
      files = readdirSync(migrationPath).filter(
        f => f.endsWith('.ts') || f.endsWith('.js')
      );
    } catch (error) {
      throw new EngineError({
        message: 'Failed to read migration directory',
        data: { path: migrationPath, error: (error as Error).message }
      });
    }

    const indexExists = await client.indices.exists({
      index: 'migrations'
    });

    const ran: string[] = [];

    for (const file of files) {
      if (indexExists) {
        const result = await client.search({
          index: 'migrations',
          query: { match: { file } }
        });

        const total = typeof result.hits.total === 'number'
          ? result.hits.total
          : result.hits.total?.value ?? 0;

        if (total > 0) {
          reportDebug({
            namespace,
            message: `Skipping migration ${file} (already ran)`
          });
          continue;
        }
      }

      reportDebug({
        namespace,
        message: `Running migration: ${file}`
      });

      ran.push(file);

      try {
        const migration = (await import(
          `${migrationPath}/${file}`
        )) as ElasticSearchMigration;

        await migration.migrate(client);

        await client.index({
          index: 'migrations',
          id: file,
          document: { file, ranAt: new Date().toISOString() }
        });

        reportDebug({
          namespace,
          message: `Successfully ran migration: ${file}`
        });
      } catch (error) {
        reportError(
          new EngineError({
            message: `Migration failed: ${file}`,
            data: { error: (error as Error).message, stack: (error as Error).stack }
          })
        );
        throw error;
      }
    }

    reportInfo({
      message: `ElasticSearch: ran ${ran.length} migration(s)`,
      data: { files: ran }
    });
  },

  /**
   * Shutdown function that should be called on server stop to close the connection
   */
  async shutdown(): Promise<void> {
    if (client) {
      try {
        await client.close();
        reportDebug({
          namespace,
          message: 'ElasticSearch client disconnected'
        });
      } catch (error) {
        reportError(
          new EngineError({
            message: 'Error during ElasticSearch shutdown',
            data: { error: (error as Error).message }
          })
        );
      }
      client = undefined;
    }
  }
};
