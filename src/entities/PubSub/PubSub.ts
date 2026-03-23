import {
  Attributes,
  PubSub as PubsubClient,
  Message
} from '@google-cloud/pubsub';
import { handleMessage } from './handleMessage';
import {
  PubSubTopicsMap,
  PubSubSubscriptionsMap,
  PubSubAddSubscriberOptions,
  PubSubMessageHandler,
  PubSubPublisherOptions
} from './PubSub.types';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';
import { reportDebug, reportError } from 'utils';

const namespace = 'engine:PubSub';

const subscriptions: PubSubSubscriptionsMap = {};
const topics: PubSubTopicsMap = {};

/**
 * Add basic retry wrapper
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 500
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      await new Promise((res) => setTimeout(res, delay * (i + 1)));
    }
  }
  throw lastError;
};

/**
 * PubSub client with safer defaults
 */
const pubSubClient = new PubsubClient({
  apiEndpoint: 'pubsub.googleapis.com'
});

export const PubSub = {
  /**
   * ✅ FAST + NON-BLOCKING INIT
   */
  async init(): Promise<void> {
    reportDebug({ namespace, message: `Initializing Pub/Sub (safe mode)` });

    for (const { subscription, handlers, isDebezium } of Object.values(
      subscriptions
    )) {
      subscription.on('message', (message) => {
        handleMessage(
          message as Message,
          subscription,
          handlers,
          isDebezium
        ).catch(reportError);
      });

      subscription.on('error', (error) => {
        reportError(error);
      });
    }

    LifecycleController.register(PubSub);
  },

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    reportDebug({ namespace, message: `Shutting down Pub/Sub` });

    await Promise.all([
      ...Object.values(topics).map(async (topic) => topic.flush()),
      ...Object.values(subscriptions).map(async ({ subscription }) =>
        subscription.close()
      )
    ]);

    Object.keys(topics).forEach((topic) => delete topics[topic]);
    Object.keys(subscriptions).forEach(
      (subscription) => delete subscriptions[subscription]
    );

    await pubSubClient.close();
  },

  /**
   * Publisher registration
   */
  addPublisher(
    topic: string | Array<string>,
    options?: PubSubPublisherOptions
  ): void {
    const topicArray = topic instanceof Array ? topic : [topic];

    reportDebug({
      namespace,
      message: `Registering publisher for topics '${topicArray.join("', '")}'`,
      data: options
    });

    for (const topic of topicArray) {
      if (!topics[topic]) {
        topics[topic] = pubSubClient.topic(topic, {
          enableOpenTelemetryTracing: true,
          messageOrdering: options?.enableMessageOrdering ?? false,
          batching: options?.batching
            ? {
                maxMessages: options.batching.maxMessages ?? 100,
                maxBytes: options.batching.maxBytes ?? 1024 * 1024,
                maxMilliseconds: options.batching.maxMilliseconds ?? 100
              }
            : undefined
        });
      }
    }
  },

  /**
   * Subscriber registration
   */
  addSubscriber<T>(
    subscriptionName: string,
    handler: PubSubMessageHandler<T> | Array<PubSubMessageHandler<T>>,
    options: PubSubAddSubscriberOptions = {}
  ): void {
    const handlers = handler instanceof Array ? handler : [handler];

    reportDebug({
      namespace,
      message: `Registering subscriber '${subscriptionName}'`,
      data: options
    });

    if (!subscriptions[subscriptionName]) {
      subscriptions[subscriptionName] = {
        subscription: pubSubClient.subscription(subscriptionName, {
          enableOpenTelemetryTracing: true,
          flowControl: options.flowControl ?? {
            maxMessages: 1000,
            maxBytes: 100 * 1024 * 1024,
            allowExcessMessages: true
          },
          ackDeadline: options.ackDeadline ?? 60
        }),
        handlers: [],
        isDebezium: options?.isDebezium ?? false
      };
    }

    if (options.first)
      subscriptions[subscriptionName].handlers.push(...handlers);
    else subscriptions[subscriptionName].handlers.unshift(...handlers);
  },

  /**
   * ✅ SAFE PUBLISH (with retry)
   */
  async publish(
    topic: string,
    message: unknown,
    attributes?: Attributes,
    orderingKey?: string
  ): Promise<void> {
    if (!topics[topic]) {
      throw new EngineError(`No publisher registered for topic '${topic}'`);
    }

    reportDebug({
      namespace,
      message: `Publishing to '${topic}'`,
      data: { message, attributes, orderingKey }
    });

    await withRetry(() =>
      topics[topic].publishMessage({
        json: message,
        attributes,
        orderingKey
      })
    );
  }
};