import { Options, Dialect } from 'sequelize';
import { validateSequelizeEnvironment } from './Sequelize.validate';

// Check that environment variables are correctly set
validateSequelizeEnvironment();

// Check if SQL_HOST is a Unix socket path (Cloud SQL)
const isUnixSocket = process.env.SQL_HOST?.startsWith('/');

const config: Options = {
  username: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB,
  host: process.env.SQL_HOST,
  // Don't set port for Unix socket connections (Cloud SQL)
  port: isUnixSocket ? undefined : (process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : 5432),
  dialect: (process.env.SQL_TYPE ?? 'postgres') as Dialect, // Dynamically set the dialect (postgres, mysql, mssql)
  logging: process.env.SQL_LOGGING === 'true' ? console.log : false, // Enable SQL logging with SQL_LOGGING=true
  define: {
    freezeTableName: false, // Prevent automatic pluralization of table names
    charset: 'utf8mb4', // Set character set for MySQL/MariaDB
    collate: 'utf8mb4_unicode_ci' // Set collation for MySQL/MariaDB
  },
  retry: {
    max: process.env.NODE_ENV === 'test' ? 0 : 3 // Disable retries in test environment to prevent unhandled rejections
  },
  dialectOptions: {},
  pool: {
    max: process.env.NODE_ENV === 'test' ? 1 : 5,
    min: 0,
    acquire: process.env.NODE_ENV === 'test' ? 1000 : 30000, // Reduce acquire timeout in test
    idle: process.env.NODE_ENV === 'test' ? 1000 : 10000, // Reduce idle time in test
    evict: process.env.NODE_ENV === 'test' ? 100 : 1000 // How often to check for idle connections
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
