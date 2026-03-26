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
const RETRYABLE_ERROR_CODES = new Set([4, 8, 10, 13, 14]); // DEADLINE_EXCEEDED, RESOURCE_EXHAUSTED, ABORTED, INTERNAL, UNAVAILABLE
const resolvedProjectId =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT_ID;

function isRetryableInitError(error: unknown): boolean {
  const err = error as { code?: number | string; message?: string } | undefined;
  const message = (err?.message ?? '').toLowerCase();
  const code =
    typeof err?.code === 'string' ? Number.parseInt(err.code, 10) : err?.code;
  return (
    (typeof code === 'number' && RETRYABLE_ERROR_CODES.has(code)) ||
    message.includes('deadline exceeded') ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('unavailable') ||
    message.includes('resource exhausted')
  );
}

async function withRetry<T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> {
  const maxAttempts = Math.max(
    1,
    Number.parseInt(process.env.PUBSUB_INIT_MAX_ATTEMPTS ?? '4', 10)
  );
  const baseDelayMs = Math.max(
    100,
    Number.parseInt(process.env.PUBSUB_INIT_RETRY_BASE_DELAY_MS ?? '1000', 10)
  );
  const maxDelayMs = Math.max(
    baseDelayMs,
    Number.parseInt(process.env.PUBSUB_INIT_RETRY_MAX_DELAY_MS ?? '10000', 10)
  );
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableInitError(error) || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      reportError({
        namespace,
        message: `Retrying Pub/Sub init operation '${operationName}'`,
        error: {
          attempt,
          maxAttempts,
          delayMs,
          reason: error instanceof Error ? error.message : String(error)
        }
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        `Pub/Sub init operation '${operationName}' failed after retries`
      );
}

/**
 * Associative containing all the subscriptions sorted by topic registered for publishing
 */
const subscriptions: PubSubSubscriptionsMap = {};

/**
 * Associative containing all the topics registered for publishing
 */
const topics: PubSubTopicsMap = {};

const pubSubClient = new PubsubClient(
  resolvedProjectId ? { projectId: resolvedProjectId } : undefined
);

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
    if (!resolvedProjectId) {
      reportDebug({
        namespace,
        message:
          'Pub/Sub projectId not set in env, relying on ADC auto-detection'
      });
    }
    const skipValidation =
      process.env.PUBSUB_SKIP_VALIDATION?.toLowerCase() === 'true';
    // Check that all topics/permissions exist, and that we have permission on them
    if (!skipValidation) {
      await Promise.all([
      // Test that all topics actually exist and that we have permissions
      ...Object.values(topics).map(async (topic) => {
        const [exists] = await withRetry(
          `topic.exists:${topic.name}`,
          async () => topic.exists()
        );
        if (!exists)
          throw new EngineError(`Topic ${topic.name} does not exist`);
        // Test permission ton publish to topic
        const [permissions] = await withRetry(
          `topic.permissions:${topic.name}`,
          async () => topic.iam.testPermissions(['pubsub.topics.publish'])
        );
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
        const [exists] = await withRetry(
          `subscription.exists:${subscription.name}`,
          async () => subscription.exists()
        );
        if (!exists)
          throw new EngineError(
            `Subscription ${subscription.name} does not exist`
          );
        // Test permission ton consume subscription
        const [permissions] = await withRetry(
          `subscription.permissions:${subscription.name}`,
          async () =>
            subscription.iam.testPermissions(['pubsub.subscriptions.consume'])
        );
        const hasPermissions = Object.values(permissions).every(
          (success) => success
        );
        if (!hasPermissions)
          throw new EngineError(
            `Instance does not have appropriate permissions to subscribe to subscription ${subscription.name}`
          );
      })
    ]);
    } else {
      reportDebug({
        namespace,
        message:
          'Skipping Pub/Sub existence and permission validation (PUBSUB_SKIP_VALIDATION=true)'
      });
    }

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
      subscription.on('error', (error) => {
        reportError({
          namespace,
          message: `Pub/Sub subscription stream error on '${subscription.name}'`,
          error
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
