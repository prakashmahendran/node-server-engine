import {
  Sequelize,
  Model,
  ModelAttributes,
  InitOptions,
  ModelStatic
} from 'sequelize';
import dbConfig from './Sequelize.config';
import {
  Sequelize as SequelizeInterface,
  ModelStorage
} from './Sequelize.types';
import { validateSequelizeEnvironment } from './Sequelize.validate';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const models: Array<ModelStorage<any>> = [];

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
      if (property === 'registerModel') return registerModel;
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
  models.forEach((model) => {
    model.model.init(model.attributes, model.options);
  });
  // Execute models associations
  models.forEach((model) => {
    model.model.associate?.();
  });
  LifecycleController.register(sequelize);
}

/** On shutdown close connection and clear client */
export async function shutdown(): Promise<void> {
  if (sequelizeClient) await sequelizeClient.close();
  sequelizeClient = undefined;
}

/** Register a model that will be initialized on sequelize init */
export function registerModel<M extends Model>(
  model: ModelStatic<M>,
  attributes: ModelAttributes<M, M['_attributes']>,
  options: InitOptions<M>
): void {
  models.push({ model, attributes, options });
}

/** Create Sequelize client */
export function createSequelizeClient(): Sequelize {
  // Throw an error if there is no host initial
  validateSequelizeEnvironment();
  return new Sequelize(
    process.env.SQL_DB as string,
    process.env.SQL_USER as string,
    process.env.SQL_PASSWORD as string,
    dbConfig
  );
}
