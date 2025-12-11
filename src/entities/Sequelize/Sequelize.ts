import { Sequelize, ModelCtor } from 'sequelize-typescript';
import dbConfig from './Sequelize.config';
import { Sequelize as SequelizeInterface } from './Sequelize.types';
import { validateSequelizeEnvironment } from './Sequelize.validate';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';
import { reportInfo, reportError } from 'utils/report';

export let sequelizeClient: undefined | Sequelize;

/**
 * We use a proxy to extend the Sequelize behavior and allow initialization of the client only when needed while keeping the same interface
 */
export const sequelize = new Proxy<SequelizeInterface>(
  // Due to how we do the proxying, we are forced to ignore ts-errors, we could never create an object that respects the interface properly
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  {},
  {
    get: function (target, property): unknown {
      if (property === 'init') return init;
      if (property === 'shutdown') return shutdown;
      if (property === 'addModels') return addModels;
      // Create the sequelize client if it does not exist
      if (!sequelizeClient)
        throw new EngineError({
          message: 'Sequelize client was not initialized'
        });
      // Call the function on the sequelize client
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return sequelizeClient[property] as unknown;
    }
  }
);

/** On init create client and connect */
export function init(): void {
  // Ignore if already initialized
  if (sequelizeClient) return;
  sequelizeClient = createSequelizeClient();
  
  // In test environment, authentication happens automatically with SQLite
  // For other environments, authenticate and log the result
  if (process.env.NODE_ENV !== 'test') {
    void sequelizeClient
      .authenticate()
      .then(() => reportInfo({ message: 'Connected to database successfully' }))
      .catch((err: Error) => reportError(err));
  }
  
  LifecycleController.register(sequelize);
}

/** On shutdown close connection and clear client */
export async function shutdown(): Promise<void> {
  if (sequelizeClient) {
    try {
      // For SQLite, just close the client (closing connection manager first causes SQLITE_MISUSE)
      // For other dialects, sequelize.close() handles everything properly
      await sequelizeClient.close();
    } catch (error) {
      // Ignore errors during shutdown
      if (process.env.NODE_ENV !== 'test') {
        console.error('Error closing sequelize client:', error);
      }
    }
  }
  sequelizeClient = undefined;
}

export function addModels(models: Array<ModelCtor>): void {
  if (!sequelizeClient)
    throw new EngineError({
      message: 'Sequelize client was not initialized'
    });
  sequelizeClient.addModels(models);
  sequelizeClient.sync();
}

/** Create Sequelize client */
export function createSequelizeClient(): Sequelize {
  // Use in-memory SQLite for test environment to avoid real database connections
  if (process.env.NODE_ENV === 'test') {
    return new Sequelize({
      dialect: 'sqlite',
      storage: ':memory:',
      logging: false
    });
  }
  
  // Throw an error if there is no host initial
  validateSequelizeEnvironment();
  return new Sequelize(
    process.env.SQL_DB as string,
    process.env.SQL_USER as string,
    process.env.SQL_PASSWORD as string,
    dbConfig
  );
}
