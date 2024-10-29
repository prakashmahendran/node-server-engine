import { SocketMessage } from '../SocketClient.types';
import { WebError } from 'entities/WebError';

/**
 * Parse an incoming message into a JSON object
 */
export function parseMessage(data: string): SocketMessage {
  try {
    const message = JSON.parse(data) as SocketMessage;
    if (message.constructor.name !== 'Object')
      throw new WebError({
        statusCode: 400,
        errorCode: 'non-json',
        message: 'Received message is not an object',
        data: { data }
      });
    return message;
  } catch {
    throw new WebError({
      statusCode: 400,
      errorCode: 'non-json',
      message: 'Received message is not valid JSON',
      data: { data }
    });
  }
}
