import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import nock, { cleanAll } from 'nock';
import { request } from './request';
import { EngineError } from 'entities/EngineError';

describe('Utils - Request', function () {
  afterEach(() => {
    cleanAll();
  });

  it('should retry a request 5 times if network errors happen', async () => {
    const url = faker.internet.url();

    const scope = nock(url)
      .get('/')
      .times(5)
      .replyWithError({ code: 'ECONNREFUSED' });

    const promise = request({ url });

    await expect(promise).to.eventually.be.rejectedWith(EngineError);

    scope.isDone();
  });
});
