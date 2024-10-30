// import path from 'path';
// import { expect } from 'chai';
// import mockFs, { restore } from 'mock-fs';
// import mockRequire from 'mock-require';
// import {
//   runPendingMigrations,
//   rollbackMigrations,
//   testClearDB
// } from './dbMigration';
// import { SequelizeMeta } from 'db/models';
// import { factory } from 'test';

// describe('Utils - DB Migration', function () {
//   beforeEach(async () => {
//     await testClearDB({ includeMetadata: true });

//     process.env.BUILD_ID = '1.5.0';

//     const basePath = path.join(process.cwd(), './src/db/migrations');
//     // Requires use the real filesystem and need to be mocked
//     const requiredContent = {
//       // eslint-disable-next-line @typescript-eslint/no-empty-function
//       up: async (): Promise<void> => {},
//       // eslint-disable-next-line @typescript-eslint/no-empty-function
//       down: async (): Promise<void> => {}
//     };
//     mockRequire(`${basePath}/1-test.js`, requiredContent);
//     mockRequire(`${basePath}/2-test.js`, requiredContent);
//     mockRequire(`${basePath}/3-test.ts`, requiredContent);
//     // Umzug checks that the files is on the FS
//     mockFs({
//       [basePath]: { '1-test.js': '', '2-test.js': '', '3-test.ts': '' }
//     });
//   });

//   afterEach(() => {
//     restore();
//     mockRequire.stopAll();
//   });

//   describe('runPendingMigrations', function () {
//     // it('should run the migrations when there are no history', async () => {
//     //   await runPendingMigrations();

//     //   const migrations = await SequelizeMeta.findAll();

//     //   expect(migrations).to.have.length(3);
//     //   migrations.forEach((migration) => {
//     //     expect(['1-test.js', '2-test.js', '3-test.ts']).to.include(migration.name);
//     //     expect(migration.version).to.equal(process.env.BUILD_ID);
//     //   });
//     // });

//     it('should prefer migrations in the prod directory', async () => {
//       const prodBasePath = path.join(process.cwd(), './dist/db/migrations');
//       // Requires use the real filesystem and need to be mocked
//       const requiredContent = {
//         // eslint-disable-next-line @typescript-eslint/no-empty-function
//         up: async (): Promise<void> => {},
//         // eslint-disable-next-line @typescript-eslint/no-empty-function
//         down: async (): Promise<void> => {}
//       };
//       mockRequire(`${prodBasePath}/1-prod-test.js`, requiredContent);
//       mockRequire(`${prodBasePath}/2-prod-test.js`, requiredContent);
//       mockRequire(`${prodBasePath}/3-prod-test.js`, requiredContent);
//       // Umzug checks that the files is on the FS
//       mockFs({
//         [prodBasePath]: {
//           '1-prod-test.js': '',
//           '2-prod-test.js': '',
//           '3-prod-test.js': ''
//         }
//       });

//       await runPendingMigrations();

//       const migrations = await SequelizeMeta.findAll();

//       expect(migrations).to.have.length(3);
//       migrations.forEach((migration) => {
//         expect([
//           '1-prod-test.js',
//           '2-prod-test.js',
//           '3-prod-test.js'
//         ]).to.include(migration.name);
//         expect(migration.version).to.equal(process.env.BUILD_ID);
//       });

//       it('should allow to specify a custom directory', async () => {
//         const customBasePath = path.join(process.cwd(), './migrations');
//         process.env.DB_MIGRATIONS_DIR = customBasePath;

//         // Requires use the real filesystem and need to be mocked
//         const requiredContent = {
//           // eslint-disable-next-line @typescript-eslint/no-empty-function
//           up: async (): Promise<void> => {},
//           // eslint-disable-next-line @typescript-eslint/no-empty-function
//           down: async (): Promise<void> => {}
//         };
//         mockRequire(`${customBasePath}/1-custom-test.js`, requiredContent);
//         mockRequire(`${customBasePath}/2-custom-test.js`, requiredContent);
//         mockRequire(`${customBasePath}/3-custom-test.js`, requiredContent);
//         // Umzug checks that the files is on the FS
//         mockFs({
//           [customBasePath]: {
//             '1-custom-test.js': '',
//             '2-custom-test.js': '',
//             '3-custom-test.js': ''
//           }
//         });

//         await runPendingMigrations();

//         const migrations = await SequelizeMeta.findAll();

//         expect(migrations).to.have.length(3);
//         migrations.forEach((migration) => {
//           expect([
//             '1-custom-test.js',
//             '2-custom-test.js',
//             '3-custom-test.js'
//           ]).to.include(migration.name);
//           expect(migration.version).to.equal(process.env.BUILD_ID);
//         });
//       });
//     });
//   });

//   describe('rollbackMigrations', function () {
//     it('should not rollback previous migrations', async () => {
//       await factory.create('sequelizeMeta', {
//         name: '1-test.js',
//         version: '1.4.0'
//       });
//       await factory.create('sequelizeMeta', {
//         name: '2-test.js',
//         version: process.env.BUILD_ID
//       });

//       await rollbackMigrations();

//       // expect(rolledBack).to.have.length(0);
//     });

//     it('should rollback the higher migrations', async () => {
//       await factory.create('sequelizeMeta', {
//         name: '1-test.js',
//         version: '1.5.0'
//       });
//       await factory.create('sequelizeMeta', {
//         name: '2-test.js',
//         version: process.env.BUILD_ID
//       });
//       await factory.create('sequelizeMeta', {
//         name: '3-test.ts',
//         version: '1.5.1'
//       });

//       await rollbackMigrations();

//       // expect(rolledBack).to.have.length(1);
//       // expect(rolledBack[0].file).to.equal('3-test.ts');
//     });

//     it('should rollback multiple migrations with higher version', async () => {
//       await factory.create('sequelizeMeta', {
//         name: '1-test.js',
//         version: process.env.BUILD_ID
//       });
//       await factory.create('sequelizeMeta', {
//         name: '2-test.js',
//         version: '1.5.2'
//       });
//       await factory.create('sequelizeMeta', {
//         name: '3-test.ts',
//         version: '1.6.0'
//       });

//       await rollbackMigrations();

//       // expect(rolledBack).to.have.length(2);
//       // rolledBack.forEach((migration) => {
//       //   expect(['2-test.js', '3-test.ts']).to.include(migration.file);
//       // });
//     });

//     it('should handle pre-release (alpha<beta)', async () => {
//       process.env.BUILD_ID = '1.5.0-alpha.2';

//       await factory.create('sequelizeMeta', {
//         name: '1-test.js',
//         version: '1.5.0-alpha.1'
//       });
//       await factory.create('sequelizeMeta', {
//         name: '2-test.js',
//         version: process.env.BUILD_ID
//       });
//       await factory.create('sequelizeMeta', {
//         name: '3-test.ts',
//         version: '1.5.0-beta.1'
//       });

//       await rollbackMigrations();

//       // expect(rolledBack).to.have.length(1);
//       // expect(rolledBack[0].file).to.equal('3-test.ts');
//     });
//   });
// });
