import { PreciseDate } from '@google-cloud/precise-date';
import {
  Subscription,
  PubSub,
  Attributes,
  Message
} from '@google-cloud/pubsub';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { fake, SinonSpy } from 'sinon';
import { handleMessage } from './handleMessage';

describe('Entities - Pub/Sub - Handle Message', () => {
  let subscription: Subscription;
  let payload: Record<string, unknown>;
  let attributes: Attributes;
  let ack: SinonSpy;
  let message: Message;
  let publishTime: PreciseDate;

  beforeEach(() => {
    subscription = new Subscription(new PubSub(), faker.lorem.slug());

    payload = { [faker.lorem.word()]: faker.lorem.word() };

    attributes = { [faker.lorem.word()]: faker.lorem.word() };
    const data = Buffer.from(JSON.stringify(payload));

    publishTime = new PreciseDate(faker.date.recent());

    ack = fake();
    message = {
      id: faker.string.uuid(),
      ack,
      ackId: faker.string.uuid(),
      data,
      attributes,
      publishTime,
      deliveryAttempt: 0,
      received: 0
    } as unknown as Message;
  });

  it('should parse the message and forward it to all the handlers', async () => {
    const handlers = [fake(), fake(), fake()];

    await handleMessage(message, subscription, handlers);

    for (const handler of handlers) {
      expect(handler).to.have.been.calledOnceWithExactly(
        payload,
        attributes,
        publishTime
      );
    }
  });

  it('should parse a debezium message [create]', async () => {
    const handler = fake();
    payload = { before: null, after: { a: 'a', b: 'b', c: 'c' } };
    message.data = Buffer.from(JSON.stringify(payload), 'utf-8');

    await handleMessage(message, subscription, [handler], true);

    expect(handler).to.have.been.calledOnceWithExactly(
      { ...payload, diff: ['a', 'b', 'c'] },
      attributes,
      publishTime
    );
  });

  it('should parse a debezium message [destroy]', async () => {
    const handler = fake();
    payload = { before: { a: 'a', b: 'b', c: 'c' }, after: null };
    message.data = Buffer.from(JSON.stringify(payload), 'utf-8');

    await handleMessage(message, subscription, [handler], true);

    expect(handler).to.have.been.calledOnceWithExactly(
      { ...payload, diff: ['a', 'b', 'c'] },
      attributes,
      publishTime
    );
  });

  it('should parse a debezium message [update]', async () => {
    const handler = fake();
    payload = {
      before: { a: 'a', b: 'b', c: 'c' },
      after: { a: 'a', b: 'y', c: 'c' }
    };
    message.data = Buffer.from(JSON.stringify(payload), 'utf-8');

    await handleMessage(message, subscription, [handler], true);

    expect(handler).to.have.been.calledOnceWithExactly(
      { ...payload, diff: ['b'] },
      attributes,
      publishTime
    );
  });
});
