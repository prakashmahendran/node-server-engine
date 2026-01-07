import { PushNotificationNotification } from './PushNotification.types';
import { EngineError } from 'entities';
import { PubSub } from 'entities/PubSub';
import { reportDebug, reportError } from 'utils';

const namespace = 'engine:PushNotification';

export const PushNotification = {
  /**
   * Initialize the push notification entity
   * Registers the publisher with optimal settings for push notifications
   */
  async init(): Promise<void> {
    reportDebug({ namespace, message: 'Initializing PushNotification' });
    if (!process.env.PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC)
      throw new EngineError({
        message:
          'Environment variable PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC is not defined'
      });
    
    // Register publisher with optimized settings for push notifications
    PubSub.addPublisher(process.env.PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC, {
      enableMessageOrdering: false, // Push notifications don't need strict ordering
      batching: {
        maxMessages: 100,
        maxBytes: 1024 * 1024, // 1MB
        maxMilliseconds: 50 // Fast delivery for notifications
      },
      retry: {
        initialDelayMillis: 100,
        maxDelayMillis: 60000,
        delayMultiplier: 1.3
      }
    });
  },

  /**
   * Send a push notification through the push service
   * @param userId - ID of the user that should receive the notification
   * @param notification - Notification that should be sent
   * @throws {EngineError} If the topic is not initialized or publish fails
   */
  async sendPush(
    userId: string,
    notification: PushNotificationNotification
  ): Promise<void> {
    if (!userId) {
      throw new EngineError({
        message: 'userId is required to send push notification'
      });
    }

    reportDebug({
      namespace,
      message: `Sending push notification to user '${userId}'`,
      data: { userId, notification }
    });

    try {
      await PubSub.publish(
        process.env.PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC as string,
        {
          ...notification,
          userId
        }
      );
    } catch (error) {
      reportError(
        new EngineError({
          message: `Failed to send push notification to user '${userId}'`,
          data: { userId, notification, error }
        })
      );
      throw error;
    }
  }
};
