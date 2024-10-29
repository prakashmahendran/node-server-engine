import { expect } from 'chai';
import { validateSequelizeEnvironment } from './Sequelize.validate';

describe('Entity - Sequelize', () => {
  it('Should validate process env if needed', () => {
    process.env.SQL_HOST = '127.0.0.1';
    process.env.SQL_PORT = '5423';
    process.env.SQL_PASSWORD = 'password';
    process.env.SQL_DB = 'db';
    process.env.SQL_USER = 'sql';
    expect(validateSequelizeEnvironment).not.to.throw();
  });

  it('Should allow only required variables', () => {
    process.env.SQL_HOST = '127.0.0.1';
    process.env.SQL_PASSWORD = 'password';
    process.env.SQL_DB = 'db';
    process.env.SQL_USER = 'sql';
    expect(validateSequelizeEnvironment).not.to.throw();
  });
});
