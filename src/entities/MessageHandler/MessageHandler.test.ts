import Ajv, { JSONSchemaType } from 'ajv';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { fake, match } from 'sinon';
import { MessageHandler } from './MessageHandler';
import { SocketClient } from 'entities/SocketClient';

const ajv = new Ajv();

/** */
interface TestPayload {
  /** */
  test?: string;
}

type TestSchema = JSONSchemaType<TestPayload>;

const schema: TestSchema = {
  type: 'object',
  properties: {
    test: { type: 'string', nullable: true }
  }
};

const validator = ajv.compile(schema);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const client = { isAuthenticated: () => true } as SocketClient;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const unauthenticatedClient = { isAuthenticated: () => false } as SocketClient;

describe('Entities - Message Handler', () => {
  it('should call the handler', async () => {
    const type = faker.lorem.word();
    const handler = fake();
    const entity = new MessageHandler(type, handler, validator);
    const message = { type, payload: {} };

    await entity.handle(message, client);

    expect(handler).to.have.been.calledOnceWithExactly(
      message.payload,
      match(client)
    );
  });

  it('should not call the handler if the type is different', async () => {
    const handler = fake();
    const entity = new MessageHandler(faker.lorem.word(), handler, validator);
    const message = { type: faker.lorem.word(), payload: {} };

    await entity.handle(message, client);

    expect(handler).to.not.have.been.called;
  });

  it('should not call the handler if the client is not authenticated', async () => {
    const type = faker.lorem.word();
    const handler = fake();
    const entity = new MessageHandler(type, handler, validator);
    const message = { type, payload: {} };

    await entity.handle(message, unauthenticatedClient);

    expect(handler).to.not.have.been.called;
  });

  it('should call the handler if the client is not authenticated, but that it is not required', async () => {
    const type = faker.lorem.word();
    const handler = fake();
    const entity = new MessageHandler(type, handler, validator, {
      authenticated: false
    });
    const message = { type, payload: {} };

    await entity.handle(message, unauthenticatedClient);

    expect(handler).to.have.been.calledOnceWithExactly(
      message.payload,
      match(unauthenticatedClient)
    );
  });

  describe('schema validation', () => {
    /** */
    interface TestPayload {
      /** */
      test: string;
    }

    type TestSchema = JSONSchemaType<TestPayload>;

    const schema: TestSchema = {
      type: 'object',
      properties: {
        test: { type: 'string' }
      },
      required: ['test']
    };

    const validator = ajv.compile(schema);

    it('should call the handler if the payload passes validation', async () => {
      const type = faker.lorem.word();
      const handler = fake();
      const entity = new MessageHandler(type, handler, validator);
      const message = { type, payload: { test: faker.lorem.word() } };

      await entity.handle(message, client);

      expect(handler).to.have.been.calledOnceWithExactly(
        message.payload,
        match(client)
      );
    });

    it('should throw an error if the payload does not pass validation', async () => {
      const type = faker.lorem.word();
      const handler = fake();
      const entity = new MessageHandler(type, handler, validator);
      const message = { type, payload: { test: faker.number.int() } };

      const result = entity.handle(message, client);
      await expect(result).to.be.rejected;
    });
  });
});
