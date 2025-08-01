import path from 'path';
import { faker } from '@faker-js/faker';

const audience = faker.internet.url();

/** Load a test environment */
process.env = {
  SILENCE_REPORT: 'true',
  // DEBUG: 'engine:*',
  PORT: '3030',
  SECONDARY_PORT: '3031',
  NODE_ENV: 'test',
  WEBSOCKET_CLOSE_TIMEOUT: '0',
  JWT_SECRET: faker.lorem.word(),
  PAYLOAD_SIGNATURE_SECRET: faker.lorem.word(),
  ACCESS_TOKEN_AUDIENCE: audience,
  ACCESS_TOKEN_ISSUER: faker.lorem.word(),
  AUTH_SERVICE_PUBLIC_URL: faker.internet.url(),
  VALID_IPS: '::ffff:127.0.0.1,127.0.0.1,::1',
  REDIS_HOST: process.env.REDIS_HOST ?? '127.0.0.1',
  REDIS_PORT: '6379',
  REDIS_CLUSTER: 'false',
  LOCALES_BUCKET: faker.lorem.word(),
  USER_SERVICE_URL: faker.internet.url(),
  PUBSUB_CACHE_TOPIC: faker.lorem.word(),
  PUBSUB_EVENT_TOPIC: faker.lorem.word(),
  TLS_SERVER_KEY: path.resolve('certs/server.key'),
  TLS_SERVER_CERT: path.resolve('certs/server.crt'),
  TLS_CA: path.resolve('certs/ca.crt'),
  TLS_REQUEST_KEY_PASSPHRASE: path.resolve('certs/ecdsa.key.pub'),
  ECDSA_PRIVATE_KEY: path.resolve('certs/ecdsa.key'),
  ECDSA_PUBLIC_KEY: path.resolve('certs/ecdsa.key.pub'),
  GITHUB_WEBHOOK_SECRET: faker.lorem.word(),
  STATIC_TOKEN: faker.lorem.word(),
  HOSTNAME: faker.lorem.slug(),
  ELASTIC_SEARCH_HOST:
    process.env.ELASTIC_SEARCH_HOST ?? 'http://localhost:9200/',
  ELASTIC_SEARCH_USERNAME: 'elastic',
  ELASTIC_SEARCH_PASSWORD: 'changeme',
  ELASTIC_SEARCH_MIGRATION_PATH: faker.lorem.word(),
  RUN_MIGRATION: 'false',
  UNDO_MIGRATION: 'false',
  SQL_HOST: process.env.SQL_HOST ?? '127.0.0.1',
  SQL_PORT: '3306',
  SQL_USER: 'tao',
  SQL_PASSWORD: 'abc@123',
  SQL_DB: 'testDb',
  SQL_TYPE: 'mysql',
  DEFAULT_MESSAGE_AUDIENCE: audience,
  GOOGLE_AI_KEY: 'AIKEY',
  ...process.env
};
