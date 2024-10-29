import { Model, STRING } from 'sequelize';
import { sequelize } from 'entities/Sequelize';

/** Attributes of the SequelizeMeta instances */
export interface SequelizeMetaCreationAttributes {
  /** Name of the file that holds the migration */
  name: string;
  /** Version of the service when the migration was executed */
  version?: string;
}

/** Attributes of the SequelizeMeta instances */
export interface SequelizeMetaAttributes {
  /** Name of the file that holds the migration */
  name: string;
  /** Version of the service when the migration was executed */
  version: string;
}

/** Class used to stored database migrations that have been executed */
export class SequelizeMeta
  extends Model<SequelizeMetaAttributes, SequelizeMetaCreationAttributes>
  implements SequelizeMetaAttributes
{
  /** Name of the file that holds the migration */
  public name!: string;
  /** Version of the service when the migration was executed */
  public version!: string;
  /** Date at which the entity was created */
  public readonly createdAt!: Date;
  /** Date at which the entity was last updated */
  public readonly updatedAt!: Date;
}

sequelize.registerModel(
  SequelizeMeta,
  {
    name: {
      allowNull: false,
      type: STRING(100),
      primaryKey: true,
      unique: true
    },
    version: {
      type: STRING(25),
      defaultValue: () => process.env.BUILD_ID
    }
  },
  {
    sequelize,
    modelName: 'sequelizeMeta',
    tableName: 'sequelize_meta'
  }
);
