import { existsSync, lstatSync, readdirSync } from 'fs';
import { join } from 'path';
import { Sequelize, Transaction } from 'sequelize';
import { Umzug, SequelizeStorage } from 'umzug';
import { ClearDbOptions, RecreateDbOptions } from './dbMigration.types';
import { migrateMetadataTable } from './migrateMetadataTable';
import { SequelizeMeta } from 'db/models';
import { EngineError } from 'entities/EngineError';
import { sequelize } from 'entities/Sequelize';
import { reportDebug, reportInfo } from 'utils/report';
import { semverCompare } from 'utils/semverCompare';

const namespace = 'engine:utils:dbMigration';

export function getMigrationPaths(): Array<string> | undefined {
  // We look between possibilities for the first directory that exists and matches our expectations
  // First a user specified one, then the production default, then the development default
  const prodDefaultPath = join(process.cwd(), './dist/db/migrations');
  const devDefaultPath = join(process.cwd(), './src/db/migrations');
  const isProduction = ['prod', 'production'].includes(
    process.env.NODE_ENV ?? ''
  );
  const path = [
    process.env.DB_MIGRATIONS_DIR,
    isProduction ? prodDefaultPath : devDefaultPath
  ]
    .filter(
      (path): path is string =>
        !!path && existsSync(path) && lstatSync(path).isDirectory()
    )
    // Only the first one: running a second folder of the same migrations (src/ next to dist/) would load
    // files this process cannot run, e.g. TypeScript sources from a built server
    .slice(0, 1);
  reportDebug({
    namespace,
    message: 'Obtaining Umzug migration options',
    data: {
      path,
      prodPath: prodDefaultPath,
      devPath: devDefaultPath,
      customPath: process.env.DB_MIGRATIONS_DIR
    }
  });
  return path.map((p) => `${p}/*.${getMigrationExtension(p)}`);
}

/**
 * Detect whether a migration folder holds TypeScript sources or compiled JavaScript,
 * so migrations are found regardless of the NODE_ENV value
 */
function getMigrationExtension(directory: string): 'ts' | 'js' {
  const hasTypeScript = readdirSync(directory).some(
    (file) => file.endsWith('.ts') && !file.endsWith('.d.ts')
  );
  return hasTypeScript ? 'ts' : 'js';
}

/** Run all the non-executed migrations one by one */
export async function runPendingMigrations(): Promise<void> {
  if (!sequelize)
    throw new EngineError({ message: 'Sequelize is not initialized' });

  try {
    reportDebug({
      namespace,
      message: 'Starting migration process',
      data: {
        sqlHost: process.env.SQL_HOST,
        sqlDb: process.env.SQL_DB,
        sqlUser: process.env.SQL_USER,
        nodeEnv: process.env.NODE_ENV
      }
    });

    // First make sure that the metadata table is up to date
    reportDebug({
      namespace,
      message: 'Migrating metadata table'
    });
    await migrateMetadataTable(sequelize);

    const migrationPaths = getMigrationPaths();

    if (!migrationPaths || migrationPaths.length <= 0) {
      reportDebug({
        namespace,
        message: 'No valid migration paths found.',
        data: { migrationPaths }
      });
      return;
    }

    // Process migrations sequentially to avoid race conditions
    for (const path of migrationPaths) {
      reportDebug({
        namespace,
        message: 'Processing migration path',
        data: { path }
      });

      const migrator = new Umzug({
        migrations: {
          glob: path,
          resolve: ({ name, path, context }) => {
            const nameWithoutExtension = name.replace(/\.(ts|js)$/, '');

            // Imported only when it runs: a migration already applied is never loaded
            const load = (): Promise<{
              up: (context: unknown) => Promise<unknown>;
              down: (context: unknown) => Promise<unknown>;
            }> => import(path || '');
            return {
              name: nameWithoutExtension,
              up: async () => {
                reportDebug({
                  namespace,
                  message: `Running migration: ${nameWithoutExtension}`
                });
                const migration = await load();
                return migration.up(context);
              },
              down: async () => {
                const migration = await load();
                return migration.down(context);
              }
            };
          }
        },
        context: sequelize.getQueryInterface(),
        storage: new SequelizeStorage({ sequelize }),
        logger: console
      });

      reportDebug({
        namespace,
        message: 'Starting pending database migrations',
        data: { path }
      });

      await migrator.up();

      reportInfo({
        message: 'Database migration completed successfully',
        data: { path }
      });
    }
  } catch (error) {
    reportDebug({
      namespace,
      message: 'Migration failed with error',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sqlHost: process.env.SQL_HOST,
        sqlDb: process.env.SQL_DB
      }
    });
    throw error;
  }
}

/** Rollback all migrations up to a specified target version */
export async function rollbackMigrations(): Promise<void> {
  if (!sequelize)
    throw new EngineError({ message: 'Sequelize is not initialized' });
  if (!process.env.BUILD_ID)
    throw new EngineError({ message: 'BUILD_ID is not defined' });

  // Fetch executed migrations in ascending order
  const migrations = await SequelizeMeta.findAll({
    order: [['name', 'ASC']],
    raw: true
  });
  const rollbackUntil = migrations.find(
    (migration) =>
      migration.version &&
      semverCompare(migration.version, process.env.BUILD_ID as string) === 1
  );

  if (!rollbackUntil) {
    reportDebug({
      namespace,
      message: 'No rollback target found for the current BUILD_ID.',
      data: { buildId: process.env.BUILD_ID }
    });
    return;
  }

  const migrationPaths = getMigrationPaths();

  if (!migrationPaths || migrationPaths.length <= 0) {
    reportDebug({
      namespace,
      message: 'No valid migration paths found for rollback.',
      data: { migrationPaths }
    });
    return;
  }

  // Process rollback migrations sequentially
  for (const path of migrationPaths) {
    const migrator = new Umzug({
      migrations: {
        glob: path,
        resolve: ({ name, path, context }) => {
          // Strip file extension to ensure consistent naming across .ts and .js files
          const nameWithoutExtension = name.replace(/\.(ts|js)$/, '');

          // Imported only when it runs: a migration already applied is never loaded
          const load = (): Promise<{
            up: (context: unknown) => Promise<unknown>;
            down: (context: unknown) => Promise<unknown>;
          }> => import(path || '');
          return {
            name: nameWithoutExtension,
            up: async () => {
              const migration = await load();
              return migration.up(context);
            },
            down: async () => {
              const migration = await load();
              return migration.down(context);
            }
          };
        }
      },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: console
    });

    reportDebug({
      namespace,
      message: `Rolling back migrations up to: ${rollbackUntil.name}`,
      data: { path }
    });

    await migrator.down({ to: rollbackUntil.name });
  }
}

/**
 * Recreate the whole database
 * Quick way to make sure that we are working on a clean database
 * /!\ Should only be used when running tests
 */
export async function testRecreateDB(
  options: RecreateDbOptions = {}
): Promise<void> {
  if (!sequelize)
    throw new EngineError({ message: 'Sequelize is not initialized' });
  await sequelize.query(
    `DROP SCHEMA public${sequelize.getDialect() === 'postgres' ? ' CASCADE' : ''}`
  );
  await sequelize.query(`CREATE SCHEMA public`);
  if (!options.clean) await runPendingMigrations();
}

/**
 * Empty all the schemas in the database
 * Quick way to flush the database data while keep the structure
 * /!\ Should only be used when running tests
 */
export async function testClearDB(options: ClearDbOptions = {}): Promise<void> {
  if (!sequelize)
    throw new EngineError({ message: 'Sequelize is not initialized' });
  await sequelize.transaction(clearDbTransaction(sequelize, options));
}

/** DB clearing transaction */
function clearDbTransaction(sequelize: Sequelize, options: ClearDbOptions) {
  return async (t: Transaction): Promise<void> => {
    for (const model of Object.keys(sequelize.models)) {
      // We ignore the migration metadata schema
      if (!options.includeMetadata && model === 'sequelizeMeta') continue;
      const table = sequelize.models[model].tableName;
      await sequelize.query(
        `TRUNCATE ${table}${sequelize.getDialect() === 'postgres' ? ' CASCADE' : ''};`,
        {
          raw: true,
          transaction: t
        }
      );
    }
  };
}
