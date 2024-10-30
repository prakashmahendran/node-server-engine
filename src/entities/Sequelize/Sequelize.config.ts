import { Options, Dialect } from 'sequelize';
import { validateSequelizeEnvironment } from './Sequelize.validate';

// Check that environment variables are correctly set
validateSequelizeEnvironment();

const config: Options = {
  username: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB,
  host: process.env.SQL_HOST,
  port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : 5432,
  dialect: (process.env.SQL_TYPE ?? 'postgres') as Dialect,
  logging: false,
  define: {
    freezeTableName: false,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  },
  retry: {
    max: 5
  }
};

export const development = config;
export const staging = config;
export const production = config;
export const test = config;
export default config;
