import { readdirSync } from 'fs';
import path from 'path';
import { Client } from '@elastic/elasticsearch';
import { ElasticSearchMigration } from './ElasticSearch.types';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';
import { envAssert, reportError, reportInfo } from 'utils';
import { checkEnvironment } from 'utils/checkEnvironment';

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
        message: 'ElasticSearch Hosts not set in environment'
      });

    client = new Client({
      node: process.env.ELASTIC_SEARCH_HOST,
      auth: {
        username: process.env.ELASTIC_SEARCH_USERNAME as string,
        password: process.env.ELASTIC_SEARCH_PASSWORD as string
      }
    });
    // In test environment flush the database before running migrations
    if (process.env.NODE_ENV === 'test')
      await client.indices.delete({ index: '*' });
    await this.migrate();
    LifecycleController.register(this);
  },

  /**
   * Migration function called during the init process
   * Manages the database structure
   */
  async migrate(): Promise<void> {
    if (!client) throw new EngineError('ElasticSearch was not initialized');
    const migrationPath = path.resolve(
      process.env.ELASTIC_SEARCH_MIGRATION_PATH as string
    );
    const files = readdirSync(`${migrationPath}`);
    const indexExists = await client.indices.exists({
      index: 'migrations'
    });
    const ran = [];
    for (const file of files) {
      if (indexExists) {
        const {
          hits: { total }
        } = await client.search({
          index: 'migrations',
          body: { query: { match: { file } } }
        });
        let tot = 0;
        if (typeof total === 'number') {
          tot = total;
        } else {
          tot = total?.value ?? 0;
        }
        if (tot > 0) continue;
      }
      ran.push(file);
      const migration = (await import(
        `${migrationPath}/${file}`
      )) as ElasticSearchMigration;
      try {
        await migration.migrate(client);
      } catch (error) {
        reportError(error);
        process.exit(1);
      }

      await client.create({
        index: 'migrations',
        id: file,
        body: { file, ranAt: new Date() }
      });
    }
    reportInfo({
      message: `ElasticSearch: ran ${ran.length} migrations`,
      data: { files: ran }
    });
  },

  /**
   * Shutdown function that should be called on server stop to close the connection
   */
  async shutdown(): Promise<void> {
    if (client) await client.close();
  }
};
