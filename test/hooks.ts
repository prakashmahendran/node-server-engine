import {
  generatePkiEnvironment,
  generateEcdsaKeyPair
} from 'backend-test-tools';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { factory } from './factory';
import { sequelize } from 'entities/Sequelize';

chai.use(chaiAsPromised);
chai.use(sinonChai);

// Save a copy to revert the environment variables to their original state before each test
const savedEnv = { ...process.env };

before(async () => {
  factory.init(sequelize);
  generatePkiEnvironment();
  generateEcdsaKeyPair();
  sequelize.init();
});

beforeEach(async () => {
  process.env = { ...savedEnv };
  sequelize.init();
});

afterEach(async () => {
  sinon.restore();
  await sequelize.shutdown();
});
