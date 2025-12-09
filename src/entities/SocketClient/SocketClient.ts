import { randomUUID } from 'crypto';
import { IncomingMessage } from 'http';
import WS, { RawData } from 'ws';
import { parseMessage } from './parseMessage';
import {
  SocketClientOptions,
  SocketClientSendMessageOptions,
  SocketAuthenticationMessage,
  SocketClientCallback,
  SocketClientList,
  SocketUser
} from './SocketClient.types';
import { LogSeverity } from 'const';
import { EngineError } from 'entities/EngineError';
import { MessageHandler } from 'entities/MessageHandler';
import { ValidationError } from 'entities/ValidationError';
import { WebError } from 'entities/WebError';
import { jwtVerify, UserTokenPayload } from 'utils/jwt';
import { reportInfo, reportError, reportDebug } from 'utils/report';

const namespace = 'SocketClient';

/**
 * Class where each instance represents a client connected through web-sockets
 */
export class SocketClient {
  /** Mapping of all the connected socket clients */
  private static socketClients: SocketClientList = {};
  /** Unique identifier of the client */
  public readonly id: string;
  /** Date at which the client connection was established */
  public readonly establishedAt: Date;
  /** WS instance of the client connection */
  private ws: WS;
  /** List of message handlers that are registered with the client */
  private handlers: Array<MessageHandler>;
  /** Callback function that are called when the client is created */
  private initCallbacks: Array<SocketClientCallback> = [];
  /** Callback function that are called when the client successfully authenticates */
  private authCallbacks: Array<SocketClientCallback> = [];
  /** Callback function that are called when the client connection is terminated */
  private shutdownCallbacks: Array<SocketClientCallback> = [];
  /** Authentication status of the client */
  private authenticated = false;
  /** Timer used to track when to send authentication renewal reminder to the client */
  private authRenewTimer: NodeJS.Timeout | string | number | undefined;
  /** Timers used to track the time at which a user losses authentication */
  private authExpireTimer: NodeJS.Timeout | string | number | undefined;
  /** ID of the user that is authenticated */
  private userId: undefined | string;
  /** ID of the device with which the client authenticated */
  private deviceId: undefined | string;
  /** Id of the token with which the client authenticated */
  private tokenId: undefined | string;
  /** Audience claims that were in the latest authentication token used by the client */
  private audience: undefined | Array<string>;
  /** Status tracking variable used to check the liveness of connections */
  private isAlive = true;
  /** Timer used to track interval between client pinging */
  private pingInterval: NodeJS.Timeout | string | number | undefined;

  /**
   * Create a WS client
   */
  public constructor(
    webSocket: WS,
    request: IncomingMessage,
    options: SocketClientOptions
  ) {
    this.id = randomUUID();
    this.ws = webSocket;
    this.establishedAt = new Date();

    reportDebug({ namespace, message: `Creating socket client [${this.id}]` });

    // Make sure that callbacks are made as lists of functions
    // Init
    if (typeof options.initCallbacks === 'function')
      this.initCallbacks = [options.initCallbacks];
    else if (options.initCallbacks instanceof Array)
      this.initCallbacks = options.initCallbacks;
    // Auth
    if (typeof options.authCallbacks === 'function')
      this.authCallbacks = [options.authCallbacks];
    else if (options.authCallbacks instanceof Array)
      this.authCallbacks = options.authCallbacks;
    // Shutdown
    if (typeof options.shutdownCallbacks === 'function')
      this.shutdownCallbacks = [options.shutdownCallbacks];
    else if (options.shutdownCallbacks instanceof Array)
      this.shutdownCallbacks = options.shutdownCallbacks;

    // Check that all handlers are valid
    this.handlers = options.handlers;
    for (const handler of this.handlers) {
      if (!(handler instanceof MessageHandler))
        throw new EngineError({
          message: 'Handler is not an instance of MessageHandler'
        });
    }
    // Register in clients list
    SocketClient.socketClients[this.id] = this;

    reportInfo({ message: `Client connected [${this.id}]` });
    // On socket close, deregister from clients list
    this.ws.on('close', () => {
      this.handleClose
        .bind(this)()
        .catch((error) => {
          reportError(error);
        });
    });
    // On socket error, log the error
    this.ws.on('error', (error) => {
      reportError(
        new EngineError({
          severity: LogSeverity.WARNING,
          message: `Error [${this.id}]`
        })
      );
      reportError(error);
    });
    // When receiving a message, call message handler
    this.ws.on('message', (data) => {
      this.handleMessage
        .bind(this)(data)
        .catch((error) => {
          reportError(error);
        });
    });

    // Run all the init callbacks
    // For proper error handling of potential asynchronous callbacks, we wrap the execution in an auto-executing async function
    (async (): Promise<void> => {
      const callbackResults = await Promise.allSettled(
        this.initCallbacks.map((callback) => callback(this))
      );
      callbackResults.forEach((result) => {
        if (result.status === 'rejected') reportError(result.reason);
      });
    })().catch((error) => {
      reportError(error);
    });

    // Server -> client ping mechanism using WS standard ping control frames
    // We terminate the connection if we did not get a reply in the previous interval
    this.pingInterval = setInterval(
      () => {
        if (!this.isAlive) {
          reportError(
            new EngineError({
              severity: LogSeverity.WARNING,
              message: `Terminating socket connection, ping timeout [${this.id}]`
            })
          );
          this.ws.terminate();
          return;
        }
        this.isAlive = false;
        this.ws.ping();
        reportDebug({ namespace, message: `Ping sent to client [${this.id}]` });
      },
      process.env.WS_PING_INTERVAL
        ? parseInt(process.env.WS_PING_INTERVAL) * 1000
        : 30000
    );

    // Track the connection as alive as we get a pong back
    this.ws.on('pong', () => {
      reportDebug({
        namespace,
        message: `Client responded to ping [${this.id}]`
      });
      this.isAlive = true;
    });
  }

  /** Get the list of all connected clients indexed by ID */
  public static getSocketClients(): SocketClientList {
    return this.socketClients;
  }

  /** Get a client by his ID */
  public static getSocketClient(id: string): SocketClient | undefined {
    return this.socketClients[id];
  }

  /**
   * Send a message to the client
   */
  public sendMessage(
    type: string,
    payload: unknown = {},
    options: SocketClientSendMessageOptions = {}
  ): void {
    reportDebug({
      namespace,
      message: `Received request to send message to client of type "${type}" [${this.id}]`,
      data: { options }
    });
    let send = false;
    // If the message is sent to unauthenticated user skip auth check
    if (options.noAuth) send = true;
    // If the message is authenticated and with the correct audience, it gets sent
    else if (
      this.authenticated &&
      (this.audience as Array<string>).includes(
        options.audience ?? (process.env.DEFAULT_MESSAGE_AUDIENCE as string)
      )
    )
      send = true;

    if (send) {
      reportDebug({
        namespace,
        message: `Sending message to client of type "${type ?? 'unknown'}" [${this.id}]`
      });
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  /** Get the client authentication status */
  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  /** Fetch data on the user if he is authenticated */
  public getUser(): SocketUser | undefined {
    if (this.authenticated)
      return {
        userId: this.userId as string,
        deviceId: this.deviceId as string,
        tokenId: this.tokenId as string,
        audience: this.audience as Array<string>
      };
    return undefined;
  }

  /** Process an incoming message */
  private async handleMessage(data: RawData): Promise<void> {
    try {
      const message = parseMessage(data.toString('utf-8'));
      reportInfo({
        message: `Received message of type "${message?.type ?? 'unknown'}" [${this.id}]`
      });
      switch (message.type) {
        case 'authenticate':
          await this.authenticate(message as SocketAuthenticationMessage);
          break;
        // As not all client libraries allow sending pings through WS control frames,
        // we add a higher level ping mechanism
        case 'ping':
          reportDebug({
            namespace,
            message: `Received ping from client [${this.id}]`
          });
          this.sendMessage('pong', {}, { noAuth: true });
          break;
        default:
          for (const handler of this.handlers) {
            await handler.handle(message, this);
          }
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Process an authentication request
   * @param {String} message - Authentication message
   */
  private async authenticate(
    message: SocketAuthenticationMessage
  ): Promise<void> {
    const token = message.payload?.token;
    if (!token) {
      throw new WebError({
        errorCode: 'no-token',
        message: 'No token was given',
        data: { message }
      });
    }
    const payload = await jwtVerify(token);
    this.setUserData(payload);

    this.authenticated = true;
    // Time remaining before token expiration
    const authExpiration = payload.exp * 1000 - Date.now();
    // Clear previously created timers
    this.clearTimeouts();
    // Send a refresh request to the client 1 minute before expiration
    this.authRenewTimer = setTimeout(
      () => {
        this.sendMessage('renewAuthentication');
      },
      authExpiration - 60 * 1000
    );
    // Expire client authentication
    this.authExpireTimer = setTimeout(() => {
      this.authenticated = false;
    }, authExpiration);

    // Run all the post-authentication callbacks
    const callbackResults = await Promise.allSettled(
      this.authCallbacks.map((callback) => callback(this))
    );
    callbackResults.forEach((result) => {
      if (result.status === 'rejected') reportError(result.reason);
    });
  }

  // Clear all the pending timers
  /** */
  private clearTimeouts(): void {
    if (this.authRenewTimer) clearTimeout(this.authRenewTimer);
    if (this.authExpireTimer) clearTimeout(this.authExpireTimer);
  }

  /**
   * Fetch the user's data and attach it to the connection for new connections. For existing connections, it checks that the authentication is done on the same user.
   */
  private setUserData({ sub, dev, jti, aud }: UserTokenPayload): void {
    // Check if the user is already authenticated
    if (this.userId) {
      // Check that the token is for the same connection as before
      if (this.userId && this.userId !== sub)
        throw new WebError({
          errorCode: 'wrong-user-token',
          message:
            'A user tried to authenticate with a token that is not for him [userId]'
        });
    } else {
      // Set the user's ID
      this.userId = sub;
      // Set the user's Device Id
      this.deviceId = dev;
      // Set the token ID
      this.tokenId = jti;
      // Set the aud
      this.audience = aud instanceof Array ? aud : [aud];

      reportDebug({
        namespace,
        message: `Successfully authenticated client [${this.id}]`,
        data: {
          userId: this.userId,
          deviceId: this.deviceId,
          tokenId: this.tokenId,
          audience: this.audience
        }
      });
    }
  }

  /**
   * Properly return errors to clients
   */
  private handleError(error: unknown): void {
    reportError(error);
    if (error instanceof WebError) {
      this.sendMessage(
        'error',
        { errorCode: error.errorCode, hint: error.hint },
        { noAuth: true }
      );
    } else if (error instanceof ValidationError) {
      this.sendMessage(
        'error',
        { errorCode: 'validation-error', hint: error.data },
        { noAuth: true }
      );
    } else {
      this.sendMessage(
        'error',
        { errorCode: 'server-error' },
        { noAuth: true }
      );
    }
  }

  /**
   * Process a socket close event
   */
  private async handleClose(code?: string, reason?: string): Promise<void> {
    delete SocketClient.socketClients[this.id];
    this.clearTimeouts();
    // Stop ping process
    if (this.pingInterval) clearInterval(this.pingInterval);
    // Run all the shutdown callbacks
    const callbackResults = await Promise.allSettled(
      this.shutdownCallbacks.map((callback) => callback(this))
    );
    callbackResults.forEach((result) => {
      if (result.status === 'rejected') reportError(result.reason);
    });
    reportInfo({
      message: `Client disconnected [${this.id}]`,
      data: { code, reason }
    });
  }
}
