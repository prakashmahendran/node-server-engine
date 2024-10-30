// import {expect} from 'chai';
// import { faker } from '@faker-js/faker';
// import {QueryTypes} from 'sequelize';
// import {testRecreateDB} from '../dbMigration';
// import {migrateMetadataTable} from './migrateMetadataTable';
// import {sequelize} from 'entities/Sequelize';

// describe('Utils - DB Migration - Migrate Metadata Table', function () {
//   before(async () => {
//     sequelize.init();
//     await testRecreateDB({clean: true});
//   });

//   afterEach(async () => {
//     await testRecreateDB({clean: true});
//   });

//   // it('should create the metadata table if it does not exist', async () => {
//   //   await migrateMetadataTable(sequelize);

//   //   const tables = await sequelize.query<[string]>(
//   //     "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
//   //     {type: QueryTypes.SELECT},
//   //   );
//   //   const hasTable = tables.some((table) => table[0] === 'sequelize_meta');
//   //   expect(hasTable).to.be.true;
//   // });

//   it('should copy legacy table data to the new table', async () => {
//     await sequelize.query('CREATE TABLE SequelizeMeta (name varchar(100) PRIMARY KEY)', {
//       type: QueryTypes.RAW,
//     });

//     const migrations = [faker.lorem.word(), faker.lorem.word(), faker.lorem.word()];
//     await sequelize.query(
//       `INSERT INTO "SequelizeMeta" ("name") VALUES ('${migrations[0]}'), ('${migrations[1]}'), ('${migrations[2]}')`,
//       {
//         type: QueryTypes.RAW,
//       },
//     );

//     await migrateMetadataTable(sequelize);

//     const results = await sequelize.query<{
//       /** Name of the migration */
//       name: string;
//       /** Version at which the migration was executed */
//       version: string;
//     }>('SELECT * FROM sequelize_meta', {
//       type: QueryTypes.SELECT,
//     });

//     expect(results).to.have.length(3);
//     results.forEach((result) => {
//       expect(migrations).to.include(result.name);
//       expect(result.version).to.be.null;
//     });
//   });
// });
