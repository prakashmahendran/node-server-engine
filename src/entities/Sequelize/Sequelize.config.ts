import { Options, Dialect } from 'sequelize';
import { validateSequelizeEnvironment } from './Sequelize.validate';

// Check that environment variables are correctly set
validateSequelizeEnvironment();

const config: Options = {
  username: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB,
  host: process.env.SQL_HOST,
  port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : 5432, // Default port for PostgreSQL
  dialect: (process.env.SQL_TYPE ?? 'postgres') as Dialect, // Dynamically set the dialect (postgres, mysql, mssql)
  logging: false, // Set to true for debugging SQL queries
  define: {
    freezeTableName: false, // Prevent automatic pluralization of table names
    charset: 'utf8mb4', // Set character set for MySQL/MariaDB
    collate: 'utf8mb4_unicode_ci' // Set collation for MySQL/MariaDB
  },
  retry: {
    max: 5 // Maximum retry attempts for failed queries
  },
  dialectOptions: {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000, // Maximum time to wait for a connection
    idle: 10000 // Maximum idle time for connections
  },
};

// Additional configurations for MSSQL
if (config.dialect === 'mssql') {
  config.dialectOptions = {
    requestTimeout: 30000, // Increase request timeout for MSSQL
    connectTimeout: 30000, // Increase connection timeout for MSSQL
    encrypt: true, // Use encryption for MSSQL (set to false if not needed)
    trustServerCertificate: true, // Set to true if using self-signed certificates
  };
}

// Add specific dialect configurations if necessary for MySQL/PostgreSQL
if (config.dialect === 'mysql') {
  config.dialectOptions = {
    timezone: 'Z', // Set timezone for MySQL
  };
}

if (config.dialect === 'postgres') {
  config.dialectOptions = {
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false, // SSL options for PostgreSQL (if required)
  };
}

export const development = config;
export const staging = config;
export const production = config;
export const test = config;
export default config;
