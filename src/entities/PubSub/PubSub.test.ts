import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { fake, match } from 'sinon';
import mockRequire from 'mock-require';

describe('Entity - PubSub - init', () => {
  let subscriptionOnFake: ReturnType<typeof fake>;
  let subscriptionCloseFake: ReturnType<typeof fake>;
  let topicFlushFake: ReturnType<typeof fake>;
  let pubSubCloseFake: ReturnType<typeof fake>;

  beforeEach(() => {
    subscriptionOnFake = fake();
    subscriptionCloseFake = fake.resolves(undefined);
    topicFlushFake = fake.resolves(undefined);
    pubSubCloseFake = fake.resolves(undefined);

    class FakePubSub {
      public topic(): { flush: ReturnType<typeof fake>; publishMessage: ReturnType<typeof fake> } {
        return {
          flush: topicFlushFake,
          publishMessage: fake.resolves(undefined)
        };
      }

      public subscription(): { on: ReturnType<typeof fake>; close: ReturnType<typeof fake> } {
        return {
          on: subscriptionOnFake,
          close: subscriptionCloseFake
        };
      }

      public close() {
        return pubSubCloseFake();
      }
    }

    mockRequire('@google-cloud/pubsub', { PubSub: FakePubSub });
    delete (require as any).cache[(require as any).resolve('./PubSub')];
  });

  afterEach(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { PubSub } = require('./PubSub');
      await PubSub.shutdown();
    } catch {
      // no-op
    }
    mockRequire.stopAll();
  });

  it('should attach message listeners to subscriptions', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PubSub } = require('./PubSub');
    const subscription = faker.lorem.slug();
    const handler = fake();

    PubSub.addSubscriber(subscription, handler);
    await PubSub.init();

    expect(subscriptionOnFake).to.have.been.calledWithExactly('message', match.func);
    expect(subscriptionOnFake).to.have.been.calledWithExactly('error', match.func);
  });

  it('should init even if validation would fail (no validation anymore)', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PubSub } = require('./PubSub');

    PubSub.addPublisher(faker.lorem.slug());
    PubSub.addSubscriber(faker.lorem.slug(), fake());

    await PubSub.init();

    expect(subscriptionOnFake).to.have.been.calledWithExactly('message', match.func);
    expect(subscriptionOnFake).to.have.been.calledWithExactly('error', match.func);
  });

  it('should handle multiple subscriptions', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PubSub } = require('./PubSub');
    const handler = fake();

    PubSub.addSubscriber(faker.lorem.slug(), handler);
    PubSub.addSubscriber(faker.lorem.slug(), handler);
    PubSub.addSubscriber(faker.lorem.slug(), handler);

    await PubSub.init();

    expect(subscriptionOnFake.callCount).to.equal(6);
  });
});
  