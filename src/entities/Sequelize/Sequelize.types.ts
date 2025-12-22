import { Sequelize as SequelizeClass, ModelCtor } from 'sequelize-typescript';

export type Sequelize = SequelizeClass & {
  /** Start the sequelize service and authenticate connection */
  init: () => Promise<void>;
  /** Stop the sequelize service */
  shutdown: () => Promise<void>;
  /** Register a model with sequelize */
  addModels: (models: Array<ModelCtor>) => void;
};
