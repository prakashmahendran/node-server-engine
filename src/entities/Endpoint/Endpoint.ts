import {
  RequestHandler,
  ErrorRequestHandler,
  Application,
  Request,
  Response,
  NextFunction
} from 'express';
import { Schema } from 'express-validator';
import { EngineError } from '../EngineError';
import {
  EndpointOptions,
  EndpointAuthType,
  EndpointAuthTypes,
  EndpointMethod,
  EndpointMethods,
  EndpointAuthParams,
  Middleware,
  MiddlewareChainElement,
  SafeMiddleWareChain,
  EndpointAuthHandlers,
  EndpointAuthHandler,
  EndpointRequestType,
  EndpointHandler
} from './Endpoint.types';
import { LogSeverity } from 'const';
import {
  validate,
  fileUploader,
  requestMetrics,
  multiPartFileUploader
} from 'middleware';
import { FileUploaderConfig } from 'middleware/fileUploader';
import { MultiPartFileUploaderConfig } from 'middleware/multiPartFileUploader';
import { reportDebug, reportError, reportInfo } from 'utils/report';

const namespace = 'engine:Endpoint';

/**
 * Object representing a REST endpoint served by server
 */
export class Endpoint<T extends EndpointAuthType> {
  /** Path at which the endpoint is reachable */
  public readonly path: string;
  /** HTTP method of the endpoint */
  public readonly method: EndpointMethod;
  /** Authentication system required by this endpoint */
  public readonly authType: T;
  /** Function handling the endpoint's business logic */
  private handler: EndpointHandler<T>;
  /** Validation schema that the request must pass before reaching the handler */
  private validator: Schema;
  /** Authentication related options for this endpoint */
  private authParams?: EndpointAuthParams<T>;
  /** Settings to upload files through this endpoint (this will automatically switch the expected request to be a multipart) */
  private files?: Array<FileUploaderConfig>;
  /** Settings to upload file parts (Chunks) through this endpoint (this will automatically switch the expected request to be a multipart) */
  private multiPartFile?: MultiPartFileUploaderConfig;
  /** Express request handlers that should run on this endpoint before the business logic, they will run after the global middleware */
  private middleware?: Array<Middleware<T>>;
  /** Express error handlers that should be registered for this endpoint. they will run before the global error handler */
  private errorMiddleware?: Array<ErrorRequestHandler>;

  /** Create a REST endpoint */
  public constructor(config: EndpointOptions<T>) {
    reportDebug({
      namespace,
      message: `Creating Endpoint [${config.method} - ${config.path}]`,
      data: {
        method: config.method,
        path: config.path,
        authType: config.authType,
        authParams: config.authParams,
        file: config.file,
        files: config.files,
        multiPartFile: config.multiPartFile
      }
    });

    if (typeof config.path !== 'string')
      throw new EngineError({
        message: 'Endpoint path was not declared as a string'
      });
    this.path = config.path;

    if (!EndpointMethods.includes(config.method))
      throw new EngineError({
        message: 'Endpoint method is not a valid HTTP method'
      });
    this.method = config.method;

    if (typeof config.handler !== 'function')
      throw new EngineError({ message: 'Endpoint handler is not a function' });
    this.handler = config.handler;

    if (!EndpointAuthTypes.includes(config.authType))
      throw new EngineError({ message: 'Endpoint auth type is not valid' });
    this.authType = config.authType;

    this.validator = config.validator;
    this.authParams = config.authParams;
    this.files = config.file ? [config.file] : config.files;

    // Middleware can both be function or arrays
    if (typeof config.middleware === 'function')
      this.middleware = [config.middleware];
    if (config.middleware instanceof Array) this.middleware = config.middleware;
    if (typeof config.errorMiddleware === 'function')
      this.errorMiddleware = [config.errorMiddleware];
    if (config.errorMiddleware instanceof Array)
      this.errorMiddleware = config.errorMiddleware;
  }

  /**
   * Register the endpoint to a react app
   */
  public register(app: Application): void {
    // First initialize the handling calculation
    const middlewareChain: Array<MiddlewareChainElement<T>> = [requestMetrics];
    // Register auth middleware
    middlewareChain.push(...this.getAuthMiddleware(this.authType));
    if (this.files) {
      // Register file upload
      // Validation is included in the file upload process as this uses multipart/form-data
      middlewareChain.push(fileUploader(this.files, this.validator));
    }

    if (this.multiPartFile) {
      middlewareChain.push(
        multiPartFileUploader(this.multiPartFile, this.validator)
      );
    }

    if (!this.files && !this.multiPartFile) {
      // Register validator for regular cases
      middlewareChain.push(validate(this.validator));
    }

    // Register additional middleware
    if (this.middleware) {
      middlewareChain.push(...this.middleware);
    }
    // Register handler
    middlewareChain.push(this.handler);
    // Wrap middleware to await any async execution and catch any errors thrown
    const safeMiddlewareChain: SafeMiddleWareChain =
      this.catchExceptionForExpress(middlewareChain);
    // Register error middleware
    if (this.errorMiddleware) {
      safeMiddlewareChain.push(...this.errorMiddleware);
    }
    app[this.method](
      this.path,
      ...(safeMiddlewareChain.flat() as Array<
        RequestHandler | ErrorRequestHandler
      >)
    );
  }

  /**
   * Catch exceptions thrown inside of middleware and pass them properly to express
   */
  private catchExceptionForExpress(
    middlewareChain: Array<MiddlewareChainElement<T>>
  ): SafeMiddleWareChain {
    return middlewareChain.map((middleware) => {
      if (middleware instanceof Array) {
        return this.catchExceptionForExpress(middleware);
      }
      if (typeof middleware === 'function') {
        return (req: Request, res: Response, next: NextFunction) => {
          (async (): Promise<void> => {
            try {
              await middleware(req as EndpointRequestType[T], res, next);
            } catch (err) {
              next(err);
            }
          })().catch((error) => {
            reportError(error);
          });
        };
      }
      throw new EngineError({
        message: 'Middleware is not a function nor an array',
        data: { type: typeof middleware }
      });
    });
  }

  /**
   * Get the authentication middleware for a given type of authentication
   */
  private getAuthMiddleware(authType: EndpointAuthType): Array<RequestHandler> {
    const middlewareChain: Array<RequestHandler> = [];

    const handler = EndpointAuthHandlers[authType] as EndpointAuthHandler<T>;
    if (!handler) {
      reportInfo({
        severity: LogSeverity.WARNING,
        message: `Endpoint "${this.method} - ${this.path}" was declared with no authentication method`
      });
      return [];
    }

    const middleware = handler(this.authParams);

    middlewareChain.push(
      async (request: Request, response: Response, next: NextFunction) => {
        try {
          await middleware(request, response, next);
        } catch (error) {
          if (!this.authParams?.acceptInvalid) throw error;
          reportError(error);
          next();
        }
      }
    );

    return middlewareChain;
  }
}
