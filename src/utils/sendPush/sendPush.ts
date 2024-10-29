import { SendPushNotification } from './sendPush.types';
import { tlsRequest } from 'utils/tlsRequest';

/**
 * Send a push notification through the push service
 * @param userId - ID of the user that should receive the notification
 * @param notification - Notification that should be sent
 * @return Push service response
 */
export async function sendPush(
  userId: string,
  notification: SendPushNotification
): Promise<unknown> {
  return tlsRequest({
    method: 'post',
    url: '/push',
    baseURL: process.env.PUSH_SERVICE_URL,
    data: { userId, ...notification }
  });
}
