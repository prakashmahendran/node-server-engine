import { PushNotificationNotification } from './PushNotification.types';
import { EngineError } from 'entities';
import { PubSub } from 'entities/PubSub';
import { reportDebug } from 'utils';

const namespace = 'engine:PushNotification';

export const PushNotification = {
  /** Initialize the push notification entity */
  init(): void {
    reportDebug({ namespace, message: 'Initializing PushNotification' });
    if (!process.env.PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC)
      throw new EngineError({
        message:
          'Environment variable PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC is not defined'
      });
    // Register publisher
    PubSub.addPublisher(process.env.PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC);
  },

  /**
   * Send a push notification through the push service
   * @param userId - ID of the user that should receive the notification
   * @param notification - Notification that should be sent
   */
  async sendPush(
    userId: string,
    notification: PushNotificationNotification
  ): Promise<void> {
    reportDebug({
      namespace,
      message: `Received data to send notification to user with Id '${userId}'`,
      data: { userId, notification }
    });

    await PubSub.publish(
      process.env.PUBSUB_PUSH_NOTIFICATION_QUEUE_TOPIC as string,
      {
        ...notification,
        userId
      }
    );
  }
};
