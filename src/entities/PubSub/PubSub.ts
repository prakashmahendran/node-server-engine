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

/**
 * Associative containing all the subscriptions sorted by topic registered for publishing
 */
const subscriptions: PubSubSubscriptionsMap = {};

/**
 * Associative containing all the topics registered for publishing
 */
const topics: PubSubTopicsMap = {};

const pubSubClient = new PubsubClient();

/**
 * This is a singleton service who's role is to manage pub/sub connections
 * It is the preferred way to interact with Pub/Sub as it manages the underlying subscription and handler objects
 * It avoids potential subscription splitting on an instance
 */
export const PubSub = {
  /**
   * Initialize the registered publishers and subscribers
   */
  async init(): Promise<void> {
    reportDebug({ namespace, message: `Initializing Pub/Sub` });
    // Check that all topics/permissions exist, and that we have permission on them
    await Promise.all([
      // Test that all topics actually exist and that we have permissions
      ...Object.values(topics).map(async (topic) => {
        const [exists] = await topic.exists();
        if (!exists)
          throw new EngineError(`Topic ${topic.name} does not exist`);
        // Test permission ton publish to topic
        const [permissions] = await topic.iam.testPermissions([
          'pubsub.topics.publish'
        ]);
        const hasPermissions = Object.values(permissions).every(
          (success) => success
        );
        if (!hasPermissions)
          throw new EngineError(
            `Instance does not have appropriate permissions to publish to topic ${topic.name}`
          );
      }),
      // Test that all subscriptions actually exist and that we have permissions
      ...Object.values(subscriptions).map(async ({ subscription }) => {
        const [exists] = await subscription.exists();
        if (!exists)
          throw new EngineError(
            `Subscription ${subscription.name} does not exist`
          );
        // Test permission ton consume subscription
        const [permissions] = await subscription.iam.testPermissions([
          'pubsub.subscriptions.consume'
        ]);
        const hasPermissions = Object.values(permissions).every(
          (success) => success
        );
        if (!hasPermissions)
          throw new EngineError(
            `Instance does not have appropriate permissions to subscribe to subscription ${subscription.name}`
          );
      })
    ]);

    // Register handlers on the subscriptions to activate them
    for (const { subscription, handlers, isDebezium } of Object.values(
      subscriptions
    )) {
      subscription.on('message', (message) => {
        handleMessage(
          message as Message,
          subscription,
          handlers,
          isDebezium
        ).catch((error) => {
          reportError(error);
        });
      });
    }

    LifecycleController.register(PubSub);
  },

  /**
   * Shutdown the registered publishers and subscribers
   */
  async shutdown(): Promise<void> {
    reportDebug({ namespace, message: `Shutting down Pub/Sub` });
    // Flush all pending messages and shut down connections
    await Promise.all([
      ...Object.values(topics).map(async (topic) => topic.flush()),
      ...Object.values(subscriptions).map(async ({ subscription }) =>
        subscription.close()
      )
    ]);
    // Delete the stored topics/subscriptions
    Object.keys(topics).forEach((topic) => delete topics[topic]);
    Object.keys(subscriptions).forEach(
      (subscription) => delete subscriptions[subscription]
    );
    // Close the client
    await pubSubClient.close();
  },

  /**
   * Creates a publisher if it does not exist yet
   * @param topic - Topic name or array of topic names
   * @param options - Publisher configuration options
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
    // Register a new topic if it does not exist yet
    for (const topic of topicArray) {
      if (!Object.keys(topics).includes(topic)) {
        topics[topic] = pubSubClient.topic(topic, {
          enableOpenTelemetryTracing: true,
          messageOrdering: options?.enableMessageOrdering ?? false,
          batching: options?.batching
            ? {
                maxMessages: options.batching.maxMessages ?? 100,
                maxBytes: options.batching.maxBytes ?? 1024 * 1024, // 1MB
                maxMilliseconds: options.batching.maxMilliseconds ?? 100
              }
            : undefined,
          gaxOpts: options?.retry
            ? {
                retry: {
                  retryCodes: [10, 14], // ABORTED, UNAVAILABLE
                  backoffSettings: {
                    initialRetryDelayMillis:
                      options.retry.initialDelayMillis ?? 100,
                    maxRetryDelayMillis: options.retry.maxDelayMillis ?? 60000,
                    retryDelayMultiplier: options.retry.delayMultiplier ?? 1.3,
                    initialRpcTimeoutMillis: 60000,
                    maxRpcTimeoutMillis: 600000,
                    rpcTimeoutMultiplier: 1.0,
                    totalTimeoutMillis: 600000
                  }
                }
              }
            : undefined
        });
      }
    }
  },

  /**
   * Add message handlers to a subscription
   * @param subscription - Name of the Pub/Sub subscription
   * @param handler - Function or list of functions to set as message handlers
   * @param options - Indicates that the additional options need to handle on Subscriber
   */
  addSubscriber<T>(
    subscription: string,
    handler: PubSubMessageHandler<T> | Array<PubSubMessageHandler<T>>,
    options: PubSubAddSubscriberOptions = {}
  ): void {
    const handlers = handler instanceof Array ? handler : [handler];
    const isDebezium = options?.isDebezium ?? false;
    const first = options?.first ?? false;
    const flowControl = options?.flowControl;
    const ackDeadline = options?.ackDeadline;

    reportDebug({
      namespace,
      message: `Registering subscriber for subscription '${subscription}'`,
      data: {
        first,
        handlersCount: handlers.length,
        isDebezium,
        flowControl
      }
    });
    if (!Object.keys(subscriptions).includes(subscription)) {
      subscriptions[subscription] = {
        subscription: pubSubClient.subscription(subscription, {
          enableOpenTelemetryTracing: true,
          flowControl: flowControl
            ? {
                maxMessages: flowControl.maxMessages ?? 1000,
                maxBytes: flowControl.maxBytes ?? 100 * 1024 * 1024, // 100MB
                allowExcessMessages: flowControl.allowExcessMessages ?? true
              }
            : {
                maxMessages: 1000,
                maxBytes: 100 * 1024 * 1024,
                allowExcessMessages: true
              },
          ackDeadline: ackDeadline ?? 60
        }),
        handlers: []
      };
    }

    if (isDebezium) subscriptions[subscription].isDebezium = true;

    if (first) subscriptions[subscription].handlers.push(...handlers);
    else subscriptions[subscription].handlers.unshift(...handlers);
  },

  /**
   * Send a message to a Pub/Sub topic
   * @param topic - Name of the topic
   * @param message - Content of the message, must be an object that can be JSON stringified
   * @param attributes - Attributes for this message, can be used to filter messages on the subscription
   * @param orderingKey - Enforce order guarantee of messages sent with the same key
   */
  async publish(
    topic: string,
    message: unknown,
    attributes?: Attributes,
    orderingKey?: string
  ): Promise<void> {
    if (!topics[topic])
      throw new EngineError(`No publisher was registered for topic '${topic}'`);
    reportDebug({
      namespace,
      message: `Sending message to topic '${topic}'`,
      data: { message, attributes, orderingKey }
    });
    await topics[topic].publishMessage({
      json: message,
      attributes,
      orderingKey
    });
  }
};
