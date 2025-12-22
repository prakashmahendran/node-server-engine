import { existsSync, lstatSync } from 'fs';
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

function getMigrationPaths(): Array<string> | undefined {
  // We look between possibilities for the first directory that exists and matches our expectations
  // First a user specified one, then the production default, then the development default
  const prodDefaultPath = join(process.cwd(), './dist/db/migrations');
  const devDefaultPath = join(process.cwd(), './src/db/migrations');
  const path = [
    process.env.DB_MIGRATIONS_DIR,
    process.env.NODE_ENV === 'prod' ? prodDefaultPath : devDefaultPath
  ].filter((path) => path && existsSync(path) && lstatSync(path).isDirectory());
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
  return path.map((p) =>
    process.env.NODE_ENV === 'prod' ? `${p}/*.js` : `${p}/*.ts`
  );
}

/** Run all the non-executed migrations one by one */
export async function runPendingMigrations(): Promise<void> {
  if (!sequelize)
    throw new EngineError({ message: 'Sequelize is not initialized' });
  // First make sure that the metadata table is up to date
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
    const migrator = new Umzug({
      migrations: {
        glob: path,
        resolve: ({ name, path, context }) => {
          const nameWithoutExtension = name.replace(/\.(ts|js)$/, '');
          
          // Use dynamic import for better TypeScript/ES module support
          const migrationPromise = import(path || '');
          return {
            name: nameWithoutExtension,
            up: async () => {
              const migration = await migrationPromise;
              return migration.up(context);
            },
            down: async () => {
              const migration = await migrationPromise;
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
          
          const migrationPromise = import(path || '');
          return {
            name: nameWithoutExtension,
            up: async () => {
              const migration = await migrationPromise;
              return migration.up(context);
            },
            down: async () => {
              const migration = await migrationPromise;
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
    `DROP SCHEMA public${process.env.SQL_TYPE === 'postgres' ? ' CASCADE' : ''}`
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
        `TRUNCATE ${table}${process.env.SQL_TYPE === 'postgres' ? ' CASCADE' : ''};`,
        {
          raw: true,
          transaction: t
        }
      );
    }
  };
}
