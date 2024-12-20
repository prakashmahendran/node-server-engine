import { Sequelize, QueryTypes } from 'sequelize';
import { SequelizeMeta } from 'db/models';
import { reportDebug } from 'utils/report';

const namespace = 'engine:utils:dbMigration';

/**
 * Run migrations on the metadata table
 * The table containing the migrations metadata cannot be handled through migrations
 * Therefore, we use a more classic approach with this function and pure SQL queries
 */
export async function migrateMetadataTable(
  sequelize: Sequelize
): Promise<void> {
  reportDebug({ namespace, message: 'Executing metadata migration routine' });

  const query = `SELECT table_name FROM information_schema.tables WHERE table_schema = '${process.env.SQL_DB}'`;

  // We check if we have a custom sequelize_meta table yet
  const tables = await sequelize.query<Array<string>>(query, {
    type: QueryTypes.SELECT
  });

  const hasCustomSequelizeMeta =
    process.env.SQL_TYPE === 'postgres'
      ? tables.some((table) => table[0] === 'sequelize_meta')
      : tables.some((table) => Object.values(table)[0] === 'sequelize_meta');
  const hasLegacySequelizeMeta =
    process.env.SQL_TYPE === 'postgres'
      ? tables.some((table) => table[0] === 'SequelizeMeta')
      : tables.some((table) => Object.values(table)[0] === 'SequelizeMeta');
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
    await sequelize.query(createTableQuery, { type: QueryTypes.RAW });

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
}
