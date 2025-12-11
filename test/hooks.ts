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

// Log unhandled errors instead of silently failing
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('❌ Reason:', reason);
  if (reason instanceof Error) {
    console.error('❌ Stack:', reason.stack);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error('❌ Stack:', error.stack);
  process.exit(1);
});

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
  
  // Wait a bit to allow async authentication to complete/fail
  // This prevents unhandled rejections from occurring during tests
  await new Promise(resolve => setTimeout(resolve, 100));
});

beforeEach(async () => {
  process.env = { ...savedEnv };
});

afterEach(async () => {
  sinon.restore();
});

// Don't shutdown sequelize in after() - causes issues with async operations
// after(async () => {
//   await sequelize.shutdown();
// });
