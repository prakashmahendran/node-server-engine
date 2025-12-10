import { expect } from 'chai';
import { stub } from 'sinon';
import { PushNotification } from './PushNotification';
import { PubSub } from 'entities/PubSub';
import { EngineError } from 'entities/EngineError';

describe('Entity - PushNotification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw if PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC is not set', () => {
    delete process.env.PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC;
    expect(() => PushNotification.init()).to.throw(EngineError);
  });

  it('should register publisher on init when topic is set', () => {
    process.env.PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC = 'push-topic';
    const addPublisherStub = stub(PubSub, 'addPublisher');
    try {
      PushNotification.init();
      expect(addPublisherStub.calledOnceWith('push-topic')).to.equal(true);
    } finally {
      addPublisherStub.restore();
    }
  });

  it('should publish push notification with userId', async () => {
    process.env.PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC = 'push-topic';
    const publishStub = stub(PubSub, 'publish').resolves();

    try {
      await PushNotification.sendPush('user-1', { title: 'Hello', body: 'World' });
      expect(publishStub.calledOnce).to.equal(true);
      const [topic, payload] = publishStub.firstCall.args as [string, any];
      expect(topic).to.equal('push-topic');
      expect(payload.userId).to.equal('user-1');
      expect(payload.title).to.equal('Hello');
      expect(payload.body).to.equal('World');
    } finally {
      publishStub.restore();
    }
  });
});
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { stub, SinonStub } from 'sinon';
import { PushNotification } from './PushNotification';
import { PushNotificationNotification } from './PushNotification.types';
import { PubSub } from 'entities/PubSub/PubSub';

describe('Entities - PushNotification', function () {
  let notification: PushNotificationNotification;
  let publishStub: SinonStub;
  let userId: string;

  beforeEach(() => {
    process.env.CHART = 'test';
    process.env.PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC = 'notification_queue';
    userId = faker.string.uuid();
    notification = {
      title: faker.lorem.word(),
      body: faker.lorem.word()
    };

    publishStub = stub(PubSub, 'publish');
  });

  it('should send push notification to the user', async () => {
    await PushNotification.sendPush(userId, notification);
    expect(publishStub).to.have.been.calledOnceWithExactly(
      'notification_queue',
      {
        ...notification,
        userId
      }
    );
  });
});
