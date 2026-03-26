import {
  PubSub as PubsubClient,
  IAM,
  Topic,
  Subscription
} from '@google-cloud/pubsub';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { stub, fake, match, SinonSpy, SinonStub } from 'sinon';
import { PubSub } from './PubSub';
import { EngineError } from 'entities/EngineError';

describe('Entities - Pub/Sub', function () {
  let topicExistsFake: SinonSpy;
  let topicIamFake: SinonSpy;
  let topicPublishFake: SinonSpy;
  let topicFlushFake: SinonSpy;
  let topicStub: SinonStub;
  let subscriptionExistsFake: SinonSpy;
  let subscriptionIamFake: SinonSpy;
  let subscriptionOnFake: SinonSpy;
  let subscriptionCloseFake: SinonSpy;
  let subscriptionStub: SinonStub;

  beforeEach(() => {
    topicExistsFake = fake.resolves([true]);

    topicIamFake = fake(async (permissions: Array<string>) =>
      permissions.reduce(
        (result, permission) => {
          result[0][permission] = true;
          return result;
        },
        [{} as Record<string, boolean>]
      )
    );
    topicPublishFake = fake.resolves(undefined);
    topicFlushFake = fake.resolves(undefined);
    topicStub = stub(PubsubClient.prototype, 'topic').callsFake(
      () =>
        ({
          exists: topicExistsFake,
          iam: { testPermissions: topicIamFake } as unknown as IAM,
          publishMessage: topicPublishFake,
          flush: topicFlushFake
        }) as unknown as Topic
    );

    subscriptionExistsFake = fake.resolves([true]);

    subscriptionIamFake = fake(async (permissions: Array<string>) =>
      permissions.reduce(
        (result, permission) => {
          result[0][permission] = true;
          return result;
        },
        [{} as Record<string, boolean>]
      )
    );
    subscriptionOnFake = fake();
    subscriptionCloseFake = fake.resolves(undefined);
    subscriptionStub = stub(PubsubClient.prototype, 'subscription').callsFake(
      () =>
        ({
          exists: subscriptionExistsFake,
          iam: { testPermissions: subscriptionIamFake } as unknown as IAM,
          on: subscriptionOnFake,
          close: subscriptionCloseFake
        }) as unknown as Subscription
    );
  });

  afterEach(async () => {
    await PubSub.shutdown();
  });

  describe('addPublisher', () => {
    it('should register a publisher only once', () => {
      const topic = faker.lorem.slug();

      PubSub.addPublisher(topic);
      PubSub.addPublisher(topic);
      PubSub.addPublisher(topic);

      expect(topicStub).to.have.been.calledOnceWithExactly(topic, match.object);
    });

    it('should register multiple publishers', () => {
      const [topic1, topic2, topic3] = [
        faker.lorem.slug(),
        faker.lorem.slug(),
        faker.lorem.slug()
      ];

      PubSub.addPublisher(topic1);
      PubSub.addPublisher([topic2, topic3]);

      expect(topicStub).to.have.been.callCount(3);
      expect(topicStub).to.have.been.calledWithExactly(topic1, match.object);
      expect(topicStub).to.have.been.calledWithExactly(topic2, match.object);
      expect(topicStub).to.have.been.calledWithExactly(topic3, match.object);
    });
  });

  describe('addSubscriber', () => {
    it('should register a subscription only once', () => {
      const subscription = faker.lorem.slug();
      const handler = fake();

      PubSub.addSubscriber(subscription, handler);
      PubSub.addSubscriber(subscription, handler);
      PubSub.addSubscriber(subscription, handler);

      expect(subscriptionStub).to.have.been.calledOnceWithExactly(
        subscription,
        match.object
      );
    });

    it('should register a subscription and making them run first when a new message arrives', () => {
      const subscription = faker.lorem.slug();
      const handler = fake();

      PubSub.addSubscriber(subscription, handler, { first: true });
      expect(subscriptionStub).to.have.been.calledOnceWithExactly(
        subscription,
        match.object
      );
    });

    it('should register a subscription with debezium events', () => {
      const subscription = faker.lorem.slug();
      const handler = fake();

      PubSub.addSubscriber(subscription, handler, { isDebezium: true });
      expect(subscriptionStub).to.have.been.calledOnceWithExactly(
        subscription,
        match.object
      );
    });

    it('should register multiple subscriptions', () => {
      const handler = fake();
      const [subscription1, subscription2, subscription3] = [
        faker.lorem.slug(),
        faker.lorem.slug(),
        faker.lorem.slug()
      ];

      PubSub.addSubscriber(subscription1, handler);
      PubSub.addSubscriber(subscription2, handler);
      PubSub.addSubscriber(subscription3, handler);

      expect(subscriptionStub).to.have.been.callCount(3);
      expect(subscriptionStub).to.have.been.calledWithExactly(
        subscription1,
        match.object
      );
      expect(subscriptionStub).to.have.been.calledWithExactly(
        subscription2,
        match.object
      );
      expect(subscriptionStub).to.have.been.calledWithExactly(
        subscription3,
        match.object
      );
    });
  });

  describe('init', () => {
    it('should throw an error if a topic does not exist', async () => {
      topicExistsFake = fake.resolves([false]);

      PubSub.addPublisher(faker.lorem.slug());

      await expect(PubSub.init()).to.be.rejectedWith(EngineError);
    });

    it('should throw an error if an instance has no permission on the topic', async () => {
      topicIamFake = fake(async (permissions: Array<string>) =>
        permissions.reduce(
          (result, permission) => {
            result[0][permission] = false;
            return result;
          },
          [{} as Record<string, boolean>]
        )
      );

      PubSub.addPublisher(faker.lorem.slug());

      await expect(PubSub.init()).to.be.rejectedWith(EngineError);
    });

    it('should throw an error if a subscription does not exist', async () => {
      const handler = fake();
      subscriptionExistsFake = fake.resolves([false]);

      PubSub.addSubscriber(faker.lorem.slug(), handler);

      await expect(PubSub.init()).to.be.rejectedWith(EngineError);
    });

    it('should throw an error if an instance has no permission on the subscription', async () => {
      const handler = fake();

      subscriptionIamFake = fake(async (permissions: Array<string>) =>
        permissions.reduce(
          (result, permission) => {
            result[0][permission] = false;
            return result;
          },
          [{} as Record<string, boolean>]
        )
      );

      PubSub.addSubscriber(faker.lorem.slug(), handler);

      await expect(PubSub.init()).to.be.rejectedWith(EngineError);
    });

    it('should successfully init', async () => {
      const topic = faker.lorem.slug();
      const subscription = faker.lorem.slug();
      const subscriptionHandler = fake();

      PubSub.addPublisher(topic);
      PubSub.addSubscriber(subscription, subscriptionHandler);

      await PubSub.init();

      expect(topicExistsFake).to.have.been.calledOnceWithExactly();
      expect(topicIamFake).to.have.been.calledOnceWithExactly([
        'pubsub.topics.publish'
      ]);
      expect(subscriptionExistsFake).to.have.been.calledOnceWithExactly();
      expect(subscriptionIamFake).to.have.been.calledOnceWithExactly([
        'pubsub.subscriptions.consume'
      ]);
      expect(subscriptionOnFake).to.have.been.calledOnceWithExactly(
        'message',
        match.func
      );
    });
  });

  describe('shutdown', () => {
    it('should flush all publishers', async () => {
      PubSub.addPublisher([
        faker.lorem.slug(),
        faker.lorem.slug(),
        faker.lorem.slug()
      ]);

      await PubSub.shutdown();

      expect(topicFlushFake).to.have.callCount(3);
    });

    it('should close all subscriptions', async () => {
      const handler = fake();
      PubSub.addSubscriber(faker.lorem.slug(), handler);
      PubSub.addSubscriber(faker.lorem.slug(), handler);
      PubSub.addSubscriber(faker.lorem.slug(), handler);

      await PubSub.shutdown();

      expect(subscriptionCloseFake).to.have.callCount(3);
    });
  });

  describe('publish', () => {
    it('should throw an error if the topi was not previously declared', async () => {
      const message = { [faker.lorem.word()]: faker.lorem.word() };
      const attributes = { [faker.lorem.word()]: faker.lorem.word() };

      await expect(
        PubSub.publish(faker.lorem.slug(), message, attributes)
      ).to.be.rejectedWith(EngineError);
    });

    it('should publish a message', async () => {
      const topic = faker.lorem.slug();
      const message = { [faker.lorem.word()]: faker.lorem.word() };
      const attributes = { [faker.lorem.word()]: faker.lorem.word() };

      PubSub.addPublisher(topic);
      await PubSub.publish(topic, message, attributes);

      expect(topicPublishFake).to.have.been.calledOnceWithExactly({
        json: message,
        attributes,
        orderingKey: undefined
      });
    });
  });
});
