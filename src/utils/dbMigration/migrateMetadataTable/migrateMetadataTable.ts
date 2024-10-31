import { Sequelize, QueryTypes } from 'sequelize';
import { SequelizeMeta } from 'db/models';
import { reportDebug } from 'utils/report';

const namespace = 'engine:utils:dbMigration';

/**
 * Run migrations on the metadata table
 * The table containing the migrations metadata can not be handled through migrations
 * Therefore we use a more classic approach with this function and pure SQL queries
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
    process.env.SQL_TYPE === 'mysql'
      ? tables.some((table) => Object.values(table)[0] === 'sequelize_meta')
      : tables.some((table) => table[0] === 'sequelize_meta');
  const hasLegacySequelizeMeta =
    process.env.SQL_TYPE === 'mysql'
      ? tables.some((table) => Object.values(table)[0] === 'SequelizeMeta')
      : tables.some((table) => table[0] === 'SequelizeMeta');

  if (!hasCustomSequelizeMeta) {
    reportDebug({
      namespace,
      message: 'No metadata table found, creating new one'
    });
    // Create the new sequelize_meta table if it does not exist
    await sequelize.query(
      `
      CREATE TABLE sequelize_meta (
        name      varchar(100) PRIMARY KEY,
        version   varchar(25),
        createdAt timestamp  NOT NULL,
        updatedAt timestamp NOT NULL
      )`,
      { type: QueryTypes.RAW }
    );

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
        ${migrations.map((migration) => `('${migration.name}', NULL, NOW(), NOW())`).join(',')}
      `;

      await sequelize.query(insertQuery, { type: QueryTypes.INSERT });
    }
  }
}
