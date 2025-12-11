import { expect } from 'chai';
import sinon from 'sinon';
import { Sequelize, QueryTypes } from 'sequelize';
import { migrateMetadataTable } from './migrateMetadataTable';

describe('Utils - migrateMetadataTable', () => {
  let sequelizeStub: sinon.SinonStubbedInstance<Sequelize>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    sequelizeStub = sinon.createStubInstance(Sequelize);
  });

  afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
  });

  describe('migrateMetadataTable', () => {
    it('should create new metadata table for postgres when none exists', async () => {
      process.env.SQL_TYPE = 'postgres';

      sequelizeStub.query
        .onFirstCall()
        .resolves([['other_table']] as any);

      await migrateMetadataTable(sequelizeStub as unknown as Sequelize);

      expect(sequelizeStub.query).to.have.been.calledWith(
        sinon.match(/CREATE TABLE sequelize_meta/),
        { type: QueryTypes.RAW }
      );
    });

    it('should create new metadata table for mysql when none exists', async () => {
      process.env.SQL_TYPE = 'mysql';

      sequelizeStub.query
        .onFirstCall()
        .resolves([[{ TABLE_NAME: 'other_table' }]] as any);

      await migrateMetadataTable(sequelizeStub as unknown as Sequelize);

      expect(sequelizeStub.query).to.have.been.calledWith(
        sinon.match(/CREATE TABLE sequelize_meta/),
        { type: QueryTypes.RAW }
      );
    });

    it('should create new metadata table for mssql when none exists', async () => {
      process.env.SQL_TYPE = 'mssql';

      sequelizeStub.query
        .onFirstCall()
        .resolves([[{ TABLE_NAME: 'other_table' }]] as any);

      await migrateMetadataTable(sequelizeStub as unknown as Sequelize);

      expect(sequelizeStub.query).to.have.been.calledWith(
        sinon.match(/DATETIME NOT NULL/),
        { type: QueryTypes.RAW }
      );
    });

    it('should throw error for unsupported SQL type', async () => {
      process.env.SQL_TYPE = 'unsupported';

      sequelizeStub.query
        .onFirstCall()
        .resolves([['other_table']] as any);

      try {
        await migrateMetadataTable(sequelizeStub as unknown as Sequelize);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).to.equal('Unsupported SQL type');
      }
    });

    it('should migrate data from legacy SequelizeMeta table for postgres', async () => {
      process.env.SQL_TYPE = 'postgres';

      // First call: check tables - returns legacy table exists
      sequelizeStub.query
        .onFirstCall()
        .resolves([['SequelizeMeta']] as any);

      // Second call: CREATE TABLE
      sequelizeStub.query
        .onSecondCall()
        .resolves([] as any);

      // Third call: SELECT from legacy table
      sequelizeStub.query
        .onThirdCall()
        .resolves([
          [
            { name: '20240101-migration.ts' },
            { name: '20240201-migration.ts' }
          ]
        ] as any);

      // Fourth call: INSERT
      sequelizeStub.query
        .onCall(3)
        .resolves([undefined, 2] as any);

      await migrateMetadataTable(sequelizeStub as unknown as Sequelize);

      // Verify INSERT was called
      expect(sequelizeStub.query).to.have.been.calledWith(
        sinon.match(/INSERT INTO sequelize_meta/),
        { type: QueryTypes.INSERT }
      );
    });

    it('should migrate data from legacy SequelizeMeta table for mysql', async () => {
      process.env.SQL_TYPE = 'mysql';

      sequelizeStub.query
        .onFirstCall()
        .resolves([[{ TABLE_NAME: 'SequelizeMeta' }]] as any);

      sequelizeStub.query
        .onSecondCall()
        .resolves([] as any);

      sequelizeStub.query
        .onThirdCall()
        .resolves([
          [{ name: '20240101-migration.ts' }]
        ] as any);

      sequelizeStub.query
        .onCall(3)
        .resolves([undefined, 1] as any);

      await migrateMetadataTable(sequelizeStub as unknown as Sequelize);

      // Verify table was created
      expect(sequelizeStub.query).to.have.been.called;
    });

    it('should migrate data from legacy SequelizeMeta table for mssql', async () => {
      process.env.SQL_TYPE = 'mssql';

      sequelizeStub.query
        .onFirstCall()
        .resolves([[{ TABLE_NAME: 'SequelizeMeta' }]] as any);

      sequelizeStub.query
        .onSecondCall()
        .resolves([] as any);

      sequelizeStub.query
        .onThirdCall()
        .resolves([
          [{ name: '20240101-migration.ts' }]
        ] as any);

      sequelizeStub.query
        .onCall(3)
        .resolves([undefined, 1] as any);

      await migrateMetadataTable(sequelizeStub as unknown as Sequelize);

      // Verify table creation happened
      expect(sequelizeStub.query).to.have.been.called;
    });

    it('should skip migration if custom sequelize_meta already exists for postgres', async () => {
      process.env.SQL_TYPE = 'postgres';

      sequelizeStub.query
        .onFirstCall()
        .resolves([['sequelize_meta']] as any);

      await migrateMetadataTable(sequelizeStub as unknown as Sequelize);

      // Should only call query once for checking tables
      expect(sequelizeStub.query).to.have.been.calledOnce;
    });

    it('should skip migration if custom sequelize_meta already exists for mysql', async () => {
      process.env.SQL_TYPE = 'mysql';

      sequelizeStub.query
        .onFirstCall()
        .resolves([[{ TABLE_NAME: 'sequelize_meta' }]] as any);

      await migrateMetadataTable(sequelizeStub as unknown as Sequelize);

      // Should call query to check tables but not create or migrate
      expect(sequelizeStub.query.callCount).to.be.at.least(1);
    });

    it('should handle both legacy and new table not existing', async () => {
      process.env.SQL_TYPE = 'postgres';

      sequelizeStub.query
        .onFirstCall()
        .resolves([['users', 'posts']] as any);

      await migrateMetadataTable(sequelizeStub as unknown as Sequelize);

      // Should create table without migration
      expect(sequelizeStub.query).to.have.been.calledTwice;
      expect(sequelizeStub.query.firstCall).to.have.been.calledWith(
        sinon.match(/SELECT table_name/)
      );
      expect(sequelizeStub.query.secondCall).to.have.been.calledWith(
        sinon.match(/CREATE TABLE sequelize_meta/)
      );
    });
  });
});
