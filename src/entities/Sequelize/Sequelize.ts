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
export async function init(): Promise<void> {
  // Ignore if already initialized
  if (sequelizeClient) return;
  
  reportInfo({
    message: 'Initializing Sequelize client',
    data: {
      host: process.env.SQL_HOST,
      database: process.env.SQL_DB,
      user: process.env.SQL_USER,
      port: process.env.SQL_PORT,
      dialect: process.env.SQL_TYPE || 'postgres',
      isUnixSocket: process.env.SQL_HOST?.startsWith('/')
    }
  });
  
  sequelizeClient = createSequelizeClient();
  
  // In test environment, authentication happens automatically with SQLite
  // For other environments, authenticate and log the result
  if (process.env.NODE_ENV !== 'test') {
    reportInfo({
      message: 'Starting database authentication'
    });

    try {
      await sequelizeClient.authenticate();
      reportInfo({ 
        message: 'Connected to database successfully',
        data: {
          host: process.env.SQL_HOST,
          database: process.env.SQL_DB,
          dialect: sequelizeClient?.getDialect()
        }
      });
    } catch (err) {
      reportError({
        message: 'Failed to connect to database',
        data: {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          host: process.env.SQL_HOST,
          database: process.env.SQL_DB,
          user: process.env.SQL_USER,
          port: process.env.SQL_PORT
        }
      });
      if (err instanceof Error) {
        reportError(err);
      }
      throw err;
    }
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
  
  // Override toJSON behavior globally to ensure consistency between dev and prod
  // In dev (ts-node), property access works directly on instances
  // In prod (compiled), we need explicit serialization
  // This hook intercepts all afterFind results and converts them to plain objects
  sequelizeClient.addHook('afterFind', (result) => {
    if (!result) return;
    
    const convertToPlain = (instance: unknown) => {
      if (!instance || typeof instance !== 'object') return instance;
      const modelInstance = instance as { toJSON?: () => Record<string, unknown> } & Record<string, unknown>;
      if (!modelInstance.toJSON) return instance;
      const plain = modelInstance.toJSON();
      // Copy the plain object properties back to the instance
      // This makes property access work without .toJSON() in compiled code
      Object.keys(plain).forEach(key => {
        modelInstance[key] = plain[key];
      });
    };
    
    if (Array.isArray(result)) {
      result.forEach(convertToPlain);
    } else {
      convertToPlain(result);
    }
  });
  
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
  
  reportInfo({
    message: 'Creating Sequelize client with config',
    data: {
      database: process.env.SQL_DB,
      username: process.env.SQL_USER,
      host: process.env.SQL_HOST,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      isUnixSocket: process.env.SQL_HOST?.startsWith('/'),
      poolMax: dbConfig.pool?.max,
      poolMin: dbConfig.pool?.min
    }
  });
  
  return new Sequelize(
    process.env.SQL_DB as string,
    process.env.SQL_USER as string,
    process.env.SQL_PASSWORD as string,
    dbConfig
  );
}
