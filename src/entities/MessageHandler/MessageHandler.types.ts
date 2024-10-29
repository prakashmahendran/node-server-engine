import { ValidateFunction } from 'ajv';
import { SocketClient } from 'entities/SocketClient';

/** Initialization options for the message handler */
export interface MessageHandlerOptions {
  /** The handler will only be called for authenticated clients (default: true) */
  authenticated?: boolean;
  /** Schema to validate the message before passing it to the handler */
  validator?: ValidateFunction;
}

export type MessageHandlerHandler = (
  payload: unknown,
  client: SocketClient
) => unknown | Promise<unknown>;
