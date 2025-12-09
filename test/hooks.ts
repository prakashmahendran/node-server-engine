import {
  generatePkiEnvironment,
  generateEcdsaKeyPair
} from 'backend-test-tools';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { factory } from 'factory-waifu';
import { sequelize } from 'entities/Sequelize';
import * as models from 'db/models';

// Import factory definitions
import { defineSequelizeMetaFactory } from './factory/sequelizeMeta';

// Increase max listeners to prevent warnings during tests
process.setMaxListeners(20);

chai.use(chaiAsPromised);
chai.use(sinonChai);

// Define factories
defineSequelizeMetaFactory(factory);

// Save a copy to revert the environment variables to their original state before each test
const savedEnv = { ...process.env };
const modelArray = Object.values(models);

before(async () => {
  factory.init(sequelize);
  generatePkiEnvironment();
  generateEcdsaKeyPair();
  sequelize.init();
  sequelize.addModels(modelArray);
});

beforeEach(async () => {
  process.env = { ...savedEnv };
});

afterEach(async () => {
  sinon.restore();
  await sequelize.shutdown();
});
