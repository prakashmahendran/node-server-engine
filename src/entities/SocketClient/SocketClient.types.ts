import { SocketClient } from './SocketClient';
import { MessageHandler } from 'entities/MessageHandler';

export type SocketClientCallback = (
  client: SocketClient
) => void | Promise<void>;

/** SocketClient creation option */
export interface SocketClientOptions {
  /** List of message handlers that are registered with the client */
  handlers: Array<MessageHandler>;
  /** Callback function that are called when the client is created */
  initCallbacks?: SocketClientCallback | Array<SocketClientCallback>;
  /** Callback function that are called when the client successfully authenticates */
  authCallbacks?: SocketClientCallback | Array<SocketClientCallback>;
  /** Callback function that are called when the client connection is terminated */
  shutdownCallbacks?: SocketClientCallback | Array<SocketClientCallback>;
}

/** Socket Message abstract typing */
export interface SocketMessage<T = unknown> {
  /** A string that identifies the message type */
  type: string;
  /** Free-form data payload of the message */
  payload: T;
}

/** SocketMessage used by client for authentication */
export interface SocketAuthenticationMessage extends SocketMessage {
  /** Sting that identifies the message type */
  type: 'authenticate';
  /** Data payload of the message */
  payload: {
    /** Authentication token */
    token: string;
  };
}

/** Options for sending a message with the client */
export interface SocketClientSendMessageOptions {
  /** Send message event if the user is not authenticated */
  noAuth?: boolean;
  /** Audience that the authenticated user must have on his token to continue */
  audience?: string;
}

/** Map of socket clients connected to the server */
export interface SocketClientList {
  [id: string]: SocketClient;
}

/** User that authenticated though his socket */
export interface SocketUser {
  /** ID od the user */
  userId: string;
  /** ID of the device */
  deviceId: string;
  /** ID of the token used */
  tokenId: string;
  /** Audience included in the token */
  audience: Array<string>;
}
