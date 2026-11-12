import { Sequelize, QueryTypes } from 'sequelize';
import { SequelizeMeta } from 'db/models';
import { reportDebug, reportError } from 'utils/report';

const namespace = 'engine:utils:dbMigration';

/** List the tables of the current database (not of every database on the server) */
function listTablesQuery(sqlType?: string): string {
  switch (sqlType) {
    case 'sqlite':
      return `SELECT name AS table_name FROM sqlite_master WHERE type = 'table'`;
    case 'mysql':
      return `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`;
    case 'postgres':
      return `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()`;
    default:
      return `SELECT table_name FROM information_schema.tables`;
  }
}

/** Extract the table name from a result row, whatever shape the driver returns */
function getTableName(row: unknown): string | undefined {
  if (typeof row === 'string') return row;
  if (Array.isArray(row)) return getTableName(row[0]);
  if (row && typeof row === 'object') return getTableName(Object.values(row)[0]);
  return undefined;
}

/**
 * Run migrations on the metadata table
 * The table containing the migrations metadata cannot be handled through migrations
 * Therefore, we use a more classic approach with this function and pure SQL queries
 */
export async function migrateMetadataTable(
  sequelize: Sequelize
): Promise<void> {
  try {
    reportDebug({ namespace, message: 'Executing metadata migration routine' });

    const query = listTablesQuery(process.env.SQL_TYPE);

    reportDebug({ 
      namespace, 
      message: 'Checking for existing metadata tables',
      data: { sqlType: process.env.SQL_TYPE }
    });

    // We check if we have a custom sequelize_meta table yet
    const tables = await sequelize.query<Record<string, unknown>>(query, {
      type: QueryTypes.SELECT
    });
    const tableNames = tables.map(getTableName);

  const hasCustomSequelizeMeta = tableNames.includes('sequelize_meta');
  const hasLegacySequelizeMeta = tableNames.includes('SequelizeMeta');
  if (!hasCustomSequelizeMeta) {
    reportDebug({
      namespace,
      message: 'No metadata table found, creating new one'
    });

    // Define SQL for creating the table based on the database type
    let createTableQuery = '';

    switch (process.env.SQL_TYPE) {
      case 'mysql':
      case 'postgres':
      case 'sqlite':
        createTableQuery = `
          CREATE TABLE sequelize_meta (
            name      VARCHAR(100) PRIMARY KEY,
            version   VARCHAR(25),
            createdAt TIMESTAMP NOT NULL,
            updatedAt TIMESTAMP NOT NULL
          )`;
        break;
      case 'mssql':
        createTableQuery = `
          CREATE TABLE sequelize_meta (
            name      VARCHAR(100) PRIMARY KEY,
            version   VARCHAR(25),
            createdAt DATETIME NOT NULL,
            updatedAt DATETIME NOT NULL
          )`;
        break;
      default:
        throw new Error('Unsupported SQL type');
    }

    // Create the new sequelize_meta table if it does not exist
    reportDebug({ 
      namespace, 
      message: 'Creating sequelize_meta table',
      data: { sqlType: process.env.SQL_TYPE }
    });
    await sequelize.query(createTableQuery, { type: QueryTypes.RAW });
    reportDebug({ namespace, message: 'sequelize_meta table created successfully' });

    // Migrate the data from the old table to the new one if needed
    if (hasLegacySequelizeMeta) {
      reportDebug({
        namespace,
        message: 'Legacy metadata table found, migrating data'
      });

      const migrations = await sequelize.query<SequelizeMeta>(
        'SELECT name FROM SequelizeMeta ORDER BY name',
        {
          type: QueryTypes.SELECT
        }
      );

      const insertQuery = `
      INSERT INTO sequelize_meta (name, version, createdAt, updatedAt) VALUES
        ${migrations
          .map((migration) => {
            switch (process.env.SQL_TYPE) {
              case 'mysql':
              case 'postgres':
                return `('${migration.name}', NULL, NOW(), NOW())`;
              case 'sqlite':
                return `('${migration.name}', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`;
              case 'mssql':
                return `('${migration.name}', NULL, GETDATE(), GETDATE())`;
              default:
                throw new Error('Unsupported SQL type');
            }
          })
          .join(',')}
    `;

      await sequelize.query(insertQuery, { type: QueryTypes.INSERT });
    }
  }
  } catch (error) {
    reportError({
      namespace,
      message: 'Error in metadata migration',
      data: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sqlType: process.env.SQL_TYPE,
        sqlHost: process.env.SQL_HOST
      }
    });
    throw error;
  }
}
