import { ValidatorSpec } from 'envalid';
import { ErrorRequestHandler, RequestHandler } from 'express';
import { ServerOptions as WebSocketServerOptions } from 'ws';
import { Endpoint } from 'entities/Endpoint';
import { SocketClientOptions } from 'entities/SocketClient';
import { SecretManagerOptions } from 'entities/SecretManager';

/** Options to create a server */
export interface ServerOptions {
  /** List of endpoint instances that the server should handle */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  endpoints: Array<Endpoint<any>>;
  /** Mapping of env variable name with functions that should run to check their validity */
  checkEnvironment?: Record<string, ValidatorSpec<unknown>>;
  /** Middleware that should run on every request before the endpoint specific logic */
  globalMiddleware?: Array<ServerGlobalMiddleware>;
  /** Error middleware that should run on every request after the endpoint specific logic, but before the generic global middleware */
  errorMiddleware?: Array<ServerGlobalMiddleware | ServerErrorMiddleWare>;
  /** Functions that should be called on server startup */
  initCallbacks?: Array<ServerCallback>;
  /** Functions that should be called on server shutdown */
  shutdownCallbacks?: Array<ServerCallback>;
  /** When set to true, this indicates that init callbacks should run synchronously in the order they are declared. By default they all run in parallel */
  syncCallbacks?: boolean;
  /** Config to set regularly running jobs on the server */
  cron?: Array<ServerCronJon>;
  /** Global auth related configuration */
  auth?: ServerAuthConfig;
  /** Configuration to enable webSocket connections to the server */
  webSocket?: ServerWebSocketConfig;
  /** Configuration for GCP Secret Manager to load secrets at startup */
  secretManager?: SecretManagerOptions;
}

/** Options for a CRON task on the server */
export interface ServerCronJon {
  /** Function that is called when the job needs to run */
  handler: () => unknown;
  /** Interval (in seconds) between each job execution. The interval starts after the previous execution finished */
  interval: number;
  /** When this is set, the job is only run on the instance that is that has been elected leader of the service */
  leaderOnly?: boolean;
}

/** Common server authentication related config */
export interface ServerAuthConfig {
  /** Do not fetch JWT authentication parameters, this should be used on servers that do not receive public requests and therefore do not need access to the authentication service */
  noFetch?: boolean;
}

/** Configuration for WebSocket on this server */
export interface ServerWebSocketConfig {
  /** Options to pass to create the webSocket server */
  server: WebSocketServerOptions;
  /** Options to pass when creating socket client instances */
  client: SocketClientOptions;
}

/** Middleware function definition with path */
export interface ServerObjectGlobalMiddleware {
  /** Path on which the middleware is used */
  path: string;
  /** Middleware function */
  middleware: RequestHandler;
}
export type ServerGlobalMiddleware =
  | RequestHandler
  | ServerObjectGlobalMiddleware;

/** Error middleware function definition with path */
export interface ServerObjectErrorMiddleware {
  /** Path on which the middleware is used */
  path: string;
  /** Middleware function */
  middleware: ErrorRequestHandler;
}
export type ServerErrorMiddleWare =
  | ErrorRequestHandler
  | ServerObjectErrorMiddleware;

type ServerFunctionCallback = (...args: Array<unknown>) => unknown;

/** Callback definition with parameters */
interface ServerObjectCallback {
  /** Callback function */
  function: ServerFunctionCallback;
  /** Parameters to pass to the callback function */
  parameters?: Parameters<ServerFunctionCallback>;
}

export type ServerCallback = ServerFunctionCallback | ServerObjectCallback;
