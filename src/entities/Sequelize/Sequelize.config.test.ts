import { expect } from 'chai';

describe('Entity - Sequelize config (mssql)', () => {
  const saved = { ...process.env };

  /** The config is computed at import time: load a fresh copy for the current environment */
  function loadConfig(): {
    dialectOptions?: { options?: Record<string, unknown> };
  } {
    const id = require.resolve('./Sequelize.config');
    delete require.cache[id];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./Sequelize.config').default;
  }

  afterEach(() => {
    process.env = { ...saved };
    delete require.cache[require.resolve('./Sequelize.config')];
  });

  it('should encrypt and verify the server certificate by default', () => {
    process.env.SQL_TYPE = 'mssql';
    delete process.env.SQL_ENCRYPT;
    delete process.env.SQL_TRUST_SERVER_CERT;
    const options = loadConfig().dialectOptions?.options;
    expect(options).to.include({
      encrypt: true,
      trustServerCertificate: false
    });
  });

  it('should only trust a self-signed certificate when explicitly allowed', () => {
    process.env.SQL_TYPE = 'mssql';
    process.env.SQL_TRUST_SERVER_CERT = 'true';
    process.env.SQL_ENCRYPT = 'false';
    const options = loadConfig().dialectOptions?.options;
    expect(options).to.include({
      encrypt: false,
      trustServerCertificate: true
    });
  });
});
