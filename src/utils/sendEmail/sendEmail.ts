import { EmailRecipient } from './sendEmail.types';
import { tlsRequest } from 'utils/tlsRequest';

/**
 * Send an email through the email service
 * @param userId - ID of the user that should receive the email
 * @param template - Email template to use
 * @param translationKey - Key used to get localized strings
 * @param parameters - Variables that can be inserted in the email template and localized strings
 * @param tags - Data injected in the localized strings as HTML tags
 * @param to - Users to which the email should be sent
 */
export async function sendEmail(
  userId: string,
  template: string,
  translationKey: string,
  parameters?: unknown,
  tags?: unknown,
  to?: Array<EmailRecipient>
): Promise<unknown> {
  return tlsRequest({
    method: 'post',
    url: '/send',
    baseURL: process.env.EMAIL_SERVICE_URL,
    data: { userId, template, translationKey, parameters, tags, to }
  });
}
