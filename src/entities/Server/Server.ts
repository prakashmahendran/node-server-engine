import fs from 'fs';
import http from 'http';
import https from 'https';
import { AddressInfo } from 'net';
import path from 'path';
import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { ValidatorSpec } from 'envalid';
import express, { Application } from 'express';
import cors from 'cors';
import { Server as WebSocketServer } from 'ws';
import { SocketClient } from '../SocketClient';
import {
  defaultMiddleware,
  defaultErrorMiddleware,
  secondaryMiddleware,
  shutdownSignals
} from './Server.const';
import {
  ServerOptions,
  ServerCronJon,
  ServerAuthConfig,
  ServerWebSocketConfig,
  ServerGlobalMiddleware,
  ServerErrorMiddleWare,
  ServerCallback
} from './Server.types';
import { Endpoint } from 'entities/Endpoint';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';
import { PubSub } from 'entities/PubSub';
import { checkEnvironment, envAssert, createHttpServer } from 'utils';
import { initKeySets, shutdownKeySets } from 'utils/jwt';
import { reportInfo, reportError, reportDebug } from 'utils/report';
import { tlsConfig, loadTlsConfig, TlsConfig } from 'utils/tlsConfig';

const namespace = 'engine:Server';

/** Main server class */
export class Server {
  /** The express application powering the main endpoints */
  private app: Application;
  /** The node HTTP(S) server, serving the main express application */
  private httpServer: http.Server | https.Server;
  /** The express application powering the support endpoints */
  private secondaryApp: Application;
  /** The node HTTP(S) server, serving the secondary express application */
  private secondaryHttpServer: http.Server | https.Server;
  /** List of endpoint instances that the server should handle */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private endpoints: Array<Endpoint<any>>;
  /** Mapping of env variable name with functions that should run to check their validity */
  private checkEnvironment: Record<string, ValidatorSpec<unknown>>;
  /** Middleware that should run on every request before the endpoint specific logic */
  private globalMiddleware: Array<ServerGlobalMiddleware>;
  /** Error middleware that should run on every request after the endpoint specific logic, but before the generic global middleware */
  private errorMiddleware: Array<
    ServerGlobalMiddleware | ServerErrorMiddleWare
  >;
  /** Functions that should be called on server startup */
  private initCallbacks: Array<ServerCallback>;
  /** Functions that should be called on server shutdown */
  private shutdownCallbacks: Array<ServerCallback>;
  /** When set to true, this indicates that init callbacks should run synchronously in the order they are declared. By default they all run in parallel */
  private syncCallbacks: boolean;
  /** Config to set regularly running jobs on the server */
  private cron?: Array<ServerCronJon>;
  /** Global auth related configuration */
  private auth: ServerAuthConfig;
  /** WebSocket server instance, if configured */
  private wss?: WebSocketServer;
  /** Abort controller that handles signals for the server */
  private abortController = new AbortController();

  /** Create a server */
  public constructor(config: ServerOptions) {
    this.validate(config);

    reportDebug({
      namespace,
      message: `Creating server`
    });

    this.endpoints = config.endpoints;
    this.globalMiddleware = config.globalMiddleware ?? [];
    this.errorMiddleware = config.errorMiddleware ?? [];
    this.initCallbacks = config.initCallbacks ?? [];
    this.shutdownCallbacks = config.shutdownCallbacks ?? [];
    this.syncCallbacks = config.syncCallbacks ?? false;
    this.cron = config.cron;
    this.auth = { noFetch: false, ...config.auth };

    // The minimal environment check is different between the migration modes of execution and the regular server execution mode
    // When running in migration mode, we only check that we have SQL related environment variables
    this.checkEnvironment =
      process.env.RUN_MIGRATION === 'true' ||
      process.env.UNDO_MIGRATION === 'true'
        ? {
            SQL_HOST: envAssert.isHost(),
            SQL_USER: envAssert.isString(),
            SQL_PASSWORD: envAssert.isString(),
            SQL_DB: envAssert.isString()
          }
        : {
            NODE_ENV: envAssert.isString(),
            PORT: envAssert.isPort(),
            SECONDARY_PORT: envAssert.isPort(),
            ...config.checkEnvironment
          };

    checkEnvironment(this.checkEnvironment);

    // Create the primary express core that serves the business logic
    this.app = express();

    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN ?? '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
      })
    );

    this.registerMiddleware(this.app);
    this.httpServer = createHttpServer(this.app);

    // Create a secondary express core that servers metrics and analytics
    // This will be served on a different port, allowing to specify different firewall rules for these routes
    this.secondaryApp = express();
    [...secondaryMiddleware, ...defaultErrorMiddleware].forEach(
      (middleware) => {
        if (middleware) this.secondaryApp.use(middleware);
      }
    );
    this.secondaryHttpServer = createHttpServer(this.secondaryApp);

    // Remove the express headers
    this.app.disable('x-powered-by');
    this.secondaryApp.disable('x-powered-by');

    // We remove all node timeout on connections and requests
    // This responsibility is delegated to the front-facing load balancer
    [this.httpServer, this.secondaryHttpServer].forEach((server) => {
      server.headersTimeout = 0;
      server.keepAliveTimeout = 0;
    });

    if (config.webSocket) {
      this.attachWebSocket(config.webSocket);
    }
  }

  /** Start the server */
  public async init(): Promise<void> {
    reportDebug({ namespace, message: `Starting Server` });
    // Fetch the keys for JWT authentication
    // Ignore in test environment as we do symmetrical token signing
    if (process.env.NODE_ENV !== 'test' && !this.auth.noFetch)
      await initKeySets();
    // Run all the init callbacks
    // We can either run them all 1/1 synchronously or run them all in parallel (default)
    // Callback can either be direct function or an object with function and parameters attributes

    if (this.syncCallbacks) {
      for (const callback of this.initCallbacks) {
        await this.runCallback(callback);
      }
    } else {
      await Promise.all(
        this.initCallbacks.map((callback) => this.runCallback(callback))
      );
    }

    // Initialize the Pub/Sub module
    await PubSub.init();
    // Run all the cronjob
    if (this.cron) {
      this.cron.forEach((job) => {
        this.runCronJob(job);
      });
    }

    // Start listening to requests
    await Promise.all([
      new Promise<void>((resolve) =>
        this.httpServer.listen(process.env.PORT, () => {
          resolve();
        })
      ),
      new Promise<void>((resolve) =>
        this.secondaryHttpServer.listen(process.env.SECONDARY_PORT, () => {
          resolve();
        })
      )
    ]);
    reportInfo({
      message: 'SERVER_RUNNING',
      data: {
        port: process.env.PORT,
        secondaryPort: process.env.SECONDARY_PORT,
        nodeEnv: process.env.NODE_ENV
      }
    });

    this.handleSignal();

    // Watch TSL config files changing
    this.watchTlsCaFileChange();
  }

  /** Graceful shutdown */
  public async shutdown(): Promise<void> {
    reportDebug({ namespace, message: `Shutting down Server` });

    // Stop listening to HTTP requests
    await Promise.all(
      [this.httpServer, this.secondaryHttpServer].map((server) => {
        // Ignore if the server was already stopped
        // We have observed cases where SIGTERM was thrown multiple times
        if (!server.listening) return;
        const { port } = server.address() as AddressInfo;
        server.on('close', (error: unknown) => {
          if (error) {
            reportError(error);
            process.exit(1);
          } else {
            reportInfo({
              message: `Stopped listening to requests on port ${port}`
            });
          }
        });
        server.close();
      })
    );

    // Close all socket connections
    if (this.wss) {
      // First ask then to close gracefully
      this.wss.clients.forEach((socket) => {
        socket.close();
      });
      // Hard terminate all connections still open after a defined time
      const socketKillTimeout = process.env.WEBSOCKET_CLOSE_TIMEOUT
        ? parseInt(process.env.WEBSOCKET_CLOSE_TIMEOUT)
        : 5000;
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          (this.wss as WebSocketServer).clients.forEach((socket) => {
            if (
              socket.readyState === socket.CLOSING ||
              socket.readyState === socket.OPEN
            ) {
              socket.terminate();
            }
          });
          resolve();
        }, socketKillTimeout);
      });
    }

    // Run all the shutdown callback
    if (this.syncCallbacks) {
      for (const callback of this.shutdownCallbacks) {
        await this.runCallback(callback);
      }
    } else {
      await Promise.all(
        this.shutdownCallbacks.map((callback) => this.runCallback(callback))
      );
    }

    // Shutdown all the running entities
    await LifecycleController.shutdownRunningInstances();

    // Abort all the cronjob
    if (this.abortController) this.abortController.abort();

    // Stop the keyset timers
    shutdownKeySets();

    shutdownSignals.forEach((signal) => process.removeAllListeners(signal));
  }

  /** Get the express app instance of the server */
  public getApp(): Application {
    return this.app;
  }

  /** Get the express app instance of the server */
  public getSecondaryApp(): Application {
    return this.secondaryApp;
  }

  /** Registers all the middleware with the express app */
  private registerMiddleware(app: Application): void {
    // Global middleware can specify a path to which they apply
    [...defaultMiddleware, ...this.globalMiddleware].forEach((middleware) => {
      if (typeof middleware === 'function') {
        app.use(middleware);
      } else {
        app.use(middleware.path, middleware.middleware);
      }
    });
    // Call the register method of each endpoint
    this.endpoints.forEach((endpoint) => {
      endpoint.register(app);
    });
    // Add error middleware
    [...this.errorMiddleware, ...defaultErrorMiddleware].forEach(
      (middleware) => {
        if (typeof middleware === 'function') {
          app.use(middleware);
        } else {
          app.use(middleware.path, middleware.middleware);
        }
      }
    );
  }

  /** Add a handler for WebSocket connections */
  private attachWebSocket(options: ServerWebSocketConfig): void {
    this.wss = new WebSocketServer({
      ...options.server,
      server: this.httpServer
    })
      .on('connection', (webSocket, request) => {
        new SocketClient(webSocket, request, options.client);
      })
      .on('error', (error) => {
        reportError(error);
      });
  }

  /** Call shutdown if signal gets sent to the process */
  private handleSignal(): void {
    shutdownSignals.forEach((signal) =>
      process.on(signal, () => {
        (async (): Promise<void> => {
          reportInfo(`Received shutdown signal [${signal}]`);
          await this.shutdown();
        })().catch((error) => {
          reportError(error);
        });
      })
    );
  }

  /** Watch the TLS certificate change event */
  private watchTlsCaFileChange(): void {
    [
      'TLS_REQUEST_KEY',
      'TLS_REQUEST_CERT',
      'TLS_REQUEST_CA',
      'TLS_SERVER_KEY',
      'TLS_SERVER_CERT',
      'TLS_CA'
    ].forEach((key) => {
      const file = process.env[key];
      if (file)
        fs.watch(path.resolve(file), (event) => {
          if (event !== 'change') return;
          reportInfo(`Reloading TLS config [${file} changed]`);
          loadTlsConfig();
          (this.httpServer as https.Server).setSecureContext(
            tlsConfig as TlsConfig
          );
        });
    });
  }

  /** Executes a recurring job */
  private runCronJob(job: ServerCronJon): void {
    (async (): Promise<void> => {
      reportInfo({ message: `Starting scheduled job "${job.handler.name}"` });
      try {
        await job.handler();
        reportInfo({
          message: `Job "${job.handler.name}" finished, starting again in ${job.interval} seconds`
        });
        await setTimeoutPromise(job.interval * 1000, undefined, {
          signal: this.abortController.signal
        });
        this.runCronJob(job);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          reportDebug({
            namespace,
            message: `Scheduled job "${job.handler?.name}" has been aborted`
          });
        } else {
          throw error;
        }
      }
    })().catch((error) => {
      reportError(error);
    });
  }

  /** Run a shutdown/init callback */
  private runCallback(callback: ServerCallback): unknown {
    return typeof callback === 'function'
      ? callback()
      : callback.function.apply(null, callback.parameters ?? []);
  }

  /**
   * Validate the Server constructor configuration
   */
  private validate(config: ServerOptions): void {
    if (
      !config.endpoints ||
      config.endpoints.some((endpoint) => !(endpoint instanceof Endpoint))
    )
      throw new EngineError(
        'Server endpoints should be declared and all be Endpoint instances'
      );

    if (
      config.checkEnvironment &&
      Object.values(config.checkEnvironment).some(
        (validator) => typeof validator !== 'function'
      )
    )
      throw new EngineError(
        'Some of the environment checks are not valid functions'
      );

    if (
      config.initCallbacks &&
      (!(config.initCallbacks instanceof Array) ||
        config.initCallbacks.some(
          (callback) =>
            !(
              typeof callback === 'function' ||
              typeof callback?.function === 'function'
            )
        ))
    )
      throw new EngineError('Init callbacks is not a list of functions');

    if (
      config.shutdownCallbacks &&
      (!(config.shutdownCallbacks instanceof Array) ||
        config.shutdownCallbacks.some(
          (callback) =>
            !(
              typeof callback === 'function' ||
              typeof callback?.function === 'function'
            )
        ))
    )
      throw new EngineError('Shutdown callbacks is not a list of functions');
  }
}
