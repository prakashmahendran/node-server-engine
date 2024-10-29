import {
  Sequelize as SequelizeClass,
  Model,
  ModelAttributes,
  InitOptions,
  ModelStatic
} from 'sequelize';

export type Sequelize = SequelizeClass & {
  /** Start the sequelize service */
  init: () => void;
  /** Stop the sequelize service */
  shutdown: () => Promise<void>;
  /** Register a model with sequelize */
  registerModel: <M extends Model>(
    model: ModelStatic<M>,
    attributes: ModelAttributes<M, M['_attributes']>,
    options: InitOptions<M>
  ) => void;
};

type ModelWithAssociation<M extends Model> = ModelStatic<M> & {
  /** Handle models associations */
  associate?: () => void;
};

/** Structure used to keep track of registered models */
export interface ModelStorage<M extends Model> {
  /** Sequelize model */
  model: ModelWithAssociation<M>;
  /** Model attributes */
  attributes: ModelAttributes<M>;
  /** Model initialization options */
  options: InitOptions<M>;
}
