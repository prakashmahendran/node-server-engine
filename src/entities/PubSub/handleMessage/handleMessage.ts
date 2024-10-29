import { Subscription, Message } from '@google-cloud/pubsub';
import { PubSubMessageHandler, PubSubDebeziumPayload } from '../PubSub.types';
import { LogSeverity } from 'const';
import { EngineError } from 'entities/EngineError';
import { reportDebug, reportError } from 'utils';

const namespace = 'engine:PubSub:handleMessage';

/**
 * handle the pubSubClients on message event
 * @param message - Message to parse and handle
 * @param subscription - The related Pub/Sub subscription object
 * @param handlers - Message handlers
 * @param isDebezium - Indicates that the subscription from Debezium events
 */
export async function handleMessage(
  message: Message,
  subscription: Subscription,
  handlers: Array<PubSubMessageHandler<unknown>>,
  isDebezium = false
): Promise<void> {
  reportDebug({
    namespace,
    message: `Received message from Pub/Sub [${subscription.name}]`
  });

  message.ack();

  let payload;
  try {
    payload = JSON.parse(message.data.toString()) as unknown;

    // When handling Debezium message, we calculate automatically the keys that have changed between the previous and current state
    if (isDebezium) {
      payload = payload as PubSubDebeziumPayload<Record<string, unknown>>;
      const { before, after } = payload;
      if (before && after)
        payload.diff = Object.keys(after).filter(
          (key) => after[key] !== before[key]
        );
      else if (before) payload.diff = Object.keys(before);
      else if (after) payload.diff = Object.keys(after);
      else
        throw new EngineError({
          severity: LogSeverity.WARNING,
          message: `Debezium Pub/Sub message did not include before nor after value [${subscription.name}]`,
          data: { subscription, message: message.data.toString() }
        });
    }
  } catch {
    throw new EngineError({
      severity: LogSeverity.WARNING,
      message: `Pub/Sub message is not valid JSON ${subscription.name}`,
      data: { subscription, message: message.data.toString() }
    });
  }

  for (const handler of handlers) {
    try {
      await handler(payload, message.attributes, message.publishTime);
    } catch (error) {
      reportError(error);
    }
  }
}
