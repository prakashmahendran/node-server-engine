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
