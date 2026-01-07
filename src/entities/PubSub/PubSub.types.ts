import { Topic, Subscription, Attributes } from '@google-cloud/pubsub';
import { DebeziumEvent } from 'const/DebeziumEvent';

/** List of all active topics */
export interface PubSubTopicsMap {
  [topic: string]: Topic;
}

/** List of subscriptions handled for each topic */
export interface PubSubSubscriptionsMap {
  [topic: string]: {
    /** The Pub/Sub subscription object */
    subscription: Subscription;
    /** The message handling functions */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    handlers: Array<PubSubMessageHandler<any>>;
    /** Indicates that the subscription from Debezium events */
    isDebezium?: boolean;
  };
}

/** Options to setup a subscription  */
export interface PubSubAddSubscriberOptions {
  /** Should the handlers declared here be added to the top of the queue, and called first when an new message arrives */
  first?: boolean;
  /** Indicates that the topic is a Debezium CDC topic, additional processing is done on the message */
  isDebezium?: boolean;
  /** Flow control settings for the subscriber */
  flowControl?: {
    /** Maximum number of messages to process concurrently */
    maxMessages?: number;
    /** Maximum bytes to process concurrently */
    maxBytes?: number;
    /** Allow more messages than maxMessages if total bytes is under maxBytes */
    allowExcessMessages?: boolean;
  };
  /** Acknowledgement deadline in seconds (10-600) */
  ackDeadline?: number;
}

/** Options for configuring a publisher */
export interface PubSubPublisherOptions {
  /** Enable message ordering (requires orderingKey when publishing) */
  enableMessageOrdering?: boolean;
  /** Batching settings */
  batching?: {
    /** Maximum messages to batch */
    maxMessages?: number;
    /** Maximum bytes to batch */
    maxBytes?: number;
    /** Maximum delay in milliseconds */
    maxMilliseconds?: number;
  };
  /** Retry settings */
  retry?: {
    /** Initial retry delay in milliseconds */
    initialDelayMillis?: number;
    /** Maximum retry delay in milliseconds */
    maxDelayMillis?: number;
    /** Retry delay multiplier */
    delayMultiplier?: number;
  };
}

export type PubSubMessageHandler<T> = (
  message: T,
  attributes: Attributes,
  publishedAt: Date
) => void | Promise<void>;

/** Debezium create event payload */
interface PubSubDebeziumCreatePayload<T> {
  /** The instance properties before the operation */
  before: null;
  /** The instance properties after the operation */
  after: T;
  /** The operation that was executed */
  op: DebeziumEvent.Create;
  /** List of fields that have changed */
  diff: Array<string>;
}

/** Debezium update event payload */
interface PubSubDebeziumUpdatePayload<T> {
  /** The instance properties before the operation */
  before: T;
  /** The instance properties after the operation */
  after: T;
  /** The operation that was executed */
  op: DebeziumEvent.Update;
  /** List of fields that have changed */
  diff: Array<string>;
}

/** Debezium delete event payload */
interface PubSubDebeziumDeletePayload<T> {
  /** The instance properties before the operation */
  before: T;
  /** The instance properties after the operation */
  after: null;
  /** The operation that was executed */
  op: DebeziumEvent.Delete;
  /** List of fields that have changed */
  diff: Array<string>;
}

/** Payload of Debezium messages */
export type PubSubDebeziumPayload<T> =
  | PubSubDebeziumCreatePayload<T>
  | PubSubDebeziumUpdatePayload<T>
  | PubSubDebeziumDeletePayload<T>;
