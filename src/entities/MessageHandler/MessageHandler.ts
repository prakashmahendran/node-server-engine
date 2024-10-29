import { ValidateFunction } from 'ajv';
import { EngineError } from '../EngineError';
import {
  MessageHandlerOptions,
  MessageHandlerHandler
} from './MessageHandler.types';
import { SocketMessage, SocketClient } from 'entities/SocketClient';
import { WebError } from 'entities/WebError';

/**
 * Message handlers should be used to define how messages should be handled in web socket servers
 */
export class MessageHandler {
  /** The type of messages that are handled by the instance */
  public readonly type: string;
  /** Function that should handle the message */
  private handler: MessageHandlerHandler;
  /** Schema against which incoming messages should be validated */
  private validator: ValidateFunction;
  /** Indicates that this handler should only run when the client is authenticated */
  private authenticated: boolean;

  /** Create a new websocket message handler */
  public constructor(
    type: string,
    handler: MessageHandlerHandler,
    validator: ValidateFunction,
    options: MessageHandlerOptions = {}
  ) {
    if (!type)
      throw new EngineError({ message: 'MessageHandler has no type defined' });
    this.type = type;
    if (!handler)
      throw new EngineError({
        message: 'MessageHandler should have a handler function'
      });
    this.handler = handler;
    this.validator = validator;
    this.authenticated = options.authenticated ?? true;
  }

  /** Handle received messages, and propagate them to the handler if needed  */
  public async handle(
    message: SocketMessage,
    client: SocketClient
  ): Promise<void> {
    const valid = this.validator(message.payload);
    if (!valid) {
      const hint = this.validator.errors?.reduce(
        (hint, error) => ({
          ...hint,
          [error.instancePath]: error.message
            ? `${error.keyword}: ${error.message}`
            : error.keyword
        }),
        {}
      );
      throw new WebError({
        statusCode: 400,
        errorCode: 'invalid-message',
        message: 'Message validation failed',
        data: hint,
        hint
      });
    }
    // Do not handle if it not for this type of handler
    if (this.type !== message.type) return;
    // When handler requires authentication but that client is not authenticated, do not handle the message.
    if (this.authenticated && !client.isAuthenticated()) return;
    await this.handler(message.payload ?? {}, client);
  }
}
