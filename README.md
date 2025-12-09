# Node Server Engine

Framework used to develop Node backend services. This package ships with a lot of features to standardize the creation of services, letting you focus on the business logic.

[![npm version](https://img.shields.io/npm/v/node-server-engine.svg)](https://www.npmjs.com/package/node-server-engine)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Features

- 🚀 **Express-based** - Built on the popular Express.js framework
- 🔒 **Multiple Auth Methods** - JWT, mTLS, HMAC, and Static token authentication
- 🔌 **WebSocket Support** - Built-in WebSocket server with message handling
- 📊 **Database Integration** - Sequelize ORM with migrations support
- 📡 **Pub/Sub** - Google Cloud Pub/Sub integration
- 🔔 **Push Notifications** - Built-in push notification support
- 🌐 **i18n** - Internationalization with translation management
- 🔍 **ElasticSearch** - Full-text search integration
- 📝 **API Documentation** - Swagger/OpenAPI documentation support
- 📤 **File Uploads** - Single and chunked file upload middleware
- 🧪 **TypeScript** - Written in TypeScript with full type definitions
- ✅ **Modern Tooling** - ESLint, Prettier, and automated versioning

## Requirements

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **TypeScript** 5.x (if contributing)

- [Node Server Engine](#node-server-engine)
  - [Features](#features)
  - [Requirements](#requirements)
  - [Install](#install)
  - [Entities](#entities)
    - [Server](#server)
      - [Server Configuration](#server-configuration)
    - [Endpoint](#endpoint)
      - [Endpoint Configuration](#endpoint-configuration)
      - [Methods](#methods)
      - [Authentication](#authentication)
      - [File Upload Middleware](#file-upload-middleware)
        - [Usage](#usage)
        - [Example](#example)
        - [Middleware Output](#middleware-output)
        - [Features](#features)
      - [Multipart File Upload Middleware](#multipart-file-upload-middleware)
        - [Usage](#usage-1)
        - [Configuration Options](#configuration-options)
        - [Expected Request Format](#expected-request-format)
        - [Middleware Output](#middleware-output-1)
        - [When all chunks are not yet received, req.multipartFile has the below JSON:](#when-all-chunks-are-not-yet-received-reqmultipartfile-has-the-below-json)
        - [When the upload is complete, req.multipartFile has the below JSON:](#when-the-upload-is-complete-reqmultipartfile-has-the-below-json)
        - [Example](#example-1)
    - [Socket Client](#socket-client)
      - [Socket Client Options](#socket-client-options)
      - [Properties](#properties)
    - [Message Handler](#message-handler)
    - [Redis](#redis)
    - [Sequelize](#sequelize)
    - [Pub/Sub](#pubsub)
    - [PushNotification](#pushnotification)
    - [Localizator](#localizator)
    - [ElasticSearch](#elasticsearch)
    - [Translation Manager](#translation-manager)
    - [Error Reporting](#error-reporting)
      - [Common options](#common-options)
      - [Severity](#severity)
        - [Log Levels](#log-levels)
      - [EngineError](#engineerror)
      - [WebError](#weberror)
  - [Middlewares](#middlewares)
    - [Swagger Docs](#swagger-docs)
      - [Structuring Documentation](#structuring-documentation)
      - [Schemas and Responses](#schemas-and-responses)
    - [User Resolver](#user-resolver)
    - [Gemini File Upload](#gemini-file-upload)
    - [Check Permission Middleware](#check-permission-middleware)
  - [Utilities](#utilities)
    - [Request](#request)
    - [TLS Request](#tls-request)
    - [TLS Config](#tls-config)
    - [Send Push Notification](#send-push-notification)
    - [Send Email](#send-email)
    - [Parameters](#parameters)
    - [Return Status](#return-status)
    - [Gemini File Upload](#gemini-file-upload-1)
    - [Parameters](#parameters-1)
    - [Response](#response)
      - [**Success Response**](#success-response)
      - [**Failure Response**](#failure-response)
    - [Return Fields](#return-fields)
    - [Error Handling](#error-handling)
    - [Filter](#filter)
    - [Database Migration](#database-migration)
    - [Environment Variables Verification](#environment-variables-verification)
      - [Assertions Available](#assertions-available)
      - [Wait](#wait)

## Install

To start a new service, it is **highly recommended** that you clone it from [our template](https://github.com/prakashmahendran/node-server-template). It will already include all the necessary tools and boilerplate.

If you need to install it manually:

```bash
npm install node-server-engine
```

For development dependencies:

```bash
npm install --save-dev backend-test-tools
```

## Entities

### Server

The server class encapsulates all of the express boilerplate. Instantiate one per service and initialize it to get started.

```javascript
import { Server } from 'node-server-engine';
const server = new Server(config);
server.init();
```

#### Server Configuration

<!-- markdownlint-disable MD033 -->

| Property          | Type                                                               | Behavior                                                                                                                                                                           | Default            |
| ----------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| port              | Number                                                             | Port to listen to                                                                                                                                                                  | `process.env.PORT` |
| endpoints         | Array\<[Endpoint](#endpoint)>                                      | List of endpoints that should be served.                                                                                                                                           | []                 |
| globalMiddleware  | Array\<Function> <br> Array\<{middleware: Function, path: String}> | List of middlewares that should be executed for each endpoint's logic. If it is given as an object with a path, it will only be applied to requests with this base path.           | []                 |
| errorMiddleware   | Array\<Function> <br> Array\<{middleware: Function, path: String}> | List of middlewares that should be executed after each endpoint's logic. If it is given as an object with a path, it will only be applied to requests with this base path.         | []                 |
| initCallbacks     | Array\<Function>                                                   | List of functions that are called on server start                                                                                                                                  |
| []                |
| syncCallbacks     | boolean                                                            | Forces the init callbacks to run one after the other and not in parallel                                                                                                           |
| false             |
| cron              | Array\<Object>                                                     | List of cronjob that are called on server start                                                                                                                                    | []                 |
| shutdownCallbacks | Array\<Function>                                                   | List of functions that are called on server shutdown                                                                                                                               | []                 |
| checkEnvironment  | Object                                                             | [Schema against which verify the environment variables](#environment-variables-verification), will cause server termination if the environment variables are not properly set.     | {}                 |
| webSocket.server  | Object                                                             | Settings to create a WebSocket server. See the [ws package documentation](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback) for details. |                    |
| webSocket.client  | Object                                                             | Settings passed down to [SocketClient](#socket-client) when a new socket connection is established.                                                                                |                    |

<!-- markdownlint-enable MD033 -->

---

### Endpoint

Endpoint encapsulates the logic of a single endpoint in a standard way.

The main function of the endpoint is called the **handler**. This function should only handle pure business logic for a given endpoint.

An endpoint usually has a **validator**. A validator is a schema that will be compared to the incoming request. The request will be denied if it contains illegal or malformed arguments. For more detail see the documentation of the underlying package [express-validator](https://express-validator.github.io/docs/schema-validation.html).

```javascript
import { Endpoint, EndpointMethod } from 'node-server-engine';

// A basic handler that returns an HTTP status code of 200 to the client
function handler(req, res) {
  res.sendStatus(200);
}

// The request must contain `id` as a query string and it must be a UUID V4
const validator = {
  id: {
    in: 'query',
    isUUID: {
      options: 4
    }
  }
};

// This endpoint can be passed to the Server
new Endpoint({
  path: '/demo',
  method: EndpointMethod.GET,
  handler,
  validator
});
```

#### Endpoint Configuration

`new Endpoint(config)`

| Property        | Type                        | Behavior                                                                                                                                       | Default       |
| --------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| path            | String                      | Path to which the endpoint should be served                                                                                                    | **required**  |
| method          | [Method](#methods)          | Method to which the endpoint should be served                                                                                                  | **required**  |
| handler         | Function                    | Endpoint handler                                                                                                                               | **required**  |
| validator       | Object                      | Schema to validate against the request. [See documentation](https://express-validator.github.io/docs/schema-validation.html) for more details. |               |
| authType        | [AuthType](#authentication) | Authentication to use for this endpoint                                                                                                        | AuthType.NONE |
| authParams      | Object                      | Options specific to the [authentication methods](#authentication)                                                                              | {}            |
| files           | Array\<Object>              | Configuration to upload files. See the [specific documentation](#file-upload).                                                                 | {}            |
| middleware      | Array\<Function>            | List of middlewares to run before the handler.                                                                                                 | []            |
| errorMiddleware | Array\<Function>            | List of middlewares to run after the handler                                                                                                   | []            |

```javascript
const addNodeEndpoint = new Endpoint({
  path: '/note',
  method: EndpointMethod.POST,
  handler: (req, res, next) => res.json(addNote(req.body)),
  authType: EndpointAuthType.AUTH_JWT,
  middleware: [checkPermission(['DeleteUser', 'AdminAccess'])],
  errorMiddleware: [addNoteErrorMiddleware],
  validator: {
    id: {
      in: 'body',
      isUUID: true
    },
    content: {
      in: 'body',
      isLength: {
        errorMessage: 'content to long',
        options: {
          max: 150
        }
      }
    }
  }
});
```

#### Methods

The following HTTP methods are supported

- Method.GET
- Method.POST
- Method.PUT
- Method.PATCH
- Method.DELETE
- Method.ALL - _respond to all requests on a path_

#### Authentication

Endpoints can take an authType and authParam in their configuration to determine their authentication behavior. The following table summarizes their usage.

The server engine exposes an enumeration for auth types.
`import {AuthType} from 'node-server-engine';`

<!-- markdownlint-disable MD033 -->

| AuthType        | Description                                                                                                                                                                                                         | AuthParams                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AuthType.NONE   | No authentication. All requests are handled                                                                                                                                                                         |                                                                                                                                                                                                                          |
| AuthType.JWT    | A valid JSON Web Token is required as Bearer token. To be valid it must be properly signed by auth0, and its payload must match with what is set as environment variables.<br>The user's ID is added to `req.user`. |                                                                                                                                                                                                                          |
| AuthType.TLS    | Authenticate through mutual TLS. CA and an optional list of white listed host names should be set in the environment variables.                                                                                     | **whitelist** [Array<String>]: List of certificate Common Name or Alt Name that are permitted to make requests to this endpoint.                                                                                         |
| AuthType.HMAC   | Authenticate with a signature in the payload.<br>**This authentication is deprecated and should be avoided**                                                                                                        | **secret** [String]: Overrides the secret used for signatures set in environment variables<br>**isGithub** [Boolean]: The request is a Github webhook and therefore uses their signature system and not the default one. |
| AuthType.STATIC | A valid shared Bearer token is required. Shared token is stored in env variable (STATIC_TOKEN)                                                                                                                      |

<!-- markdownlint-enable MD033 -->

#### File Upload Middleware

This middleware handles multipart file uploads in an Express application. It processes files in memory, validates them based on configuration options, and ensures that required files are uploaded.

##### Usage

The request must be made using `multipart/form-data`. The uploaded files will be available in `req.files`.

The following settings can be used on each object the Endpoint's `options.files`.

| Property    | Type           | Description                                                          | Default      |
| ----------- | -------------- | -------------------------------------------------------------------- | ------------ |
| key         | string         | Form key as which the file should be fetched                         | **required** |
| maxSize     | string         | Maximum file size in a human readable format (ex: 5MB)               | **required** |
| mimeTypes   | Array\<string> | A list of accepted MIME Types                                        | []           |
| required    | boolean        | Will fail the request and not store the files if this one is missing | false        |
| noExtension | boolean        | Store the file with no extension                                     | false        |

##### Example

```typescript
import { body } from 'express-validator';
import { Endpoint, middleware, AuthType, Method } from 'node-server-engine';

const filesConfig = [
  { key: 'avatar', mimeTypes: ['image/png', 'image/jpeg'], required: true },
  { key: 'document', mimeTypes: ['application/pdf'], maxSize: '5MB' }
];

new Endpoint({
  path: '/upload',
  method: Method.POST,
  authType: AuthType.JWT,
  files: filesConfig,
  handler: (req, res) => {
    res.json({ message: 'Files uploaded successfully', files: req.files });
  }
});
```

##### Middleware Output

The middleware adds a `files` object to the `req` object, which contains information about the uploaded file.

```json
 [
    {
      "fieldname": "avatar",
      "originalname": "profile.png",
      "mimetype": "image/png",
      "size": 204800,
      "buffer":[]
    },
    {
      "fieldname": "document",
      "originalname": "resume.pdf",
      "mimetype": "application/pdf",
      "size": 512000,
      "buffer":[]
    }
  ]
```

##### Features

- Supports multiple file uploads.
- Validates file types and sizes.
- Ensures required files are uploaded.
- Uses memory storage (files are not saved to disk).

This middleware simplifies file handling in Express, making it easy to manage uploads while enforcing validation rules.

---

#### Multipart File Upload Middleware

This middleware enables chunked file uploads in an Express application. It allows uploading large files by splitting them into smaller chunks, validating them, and merging them once all parts are received.

##### Usage

The request must be made using `multipart/form-data`. The uploaded chunks are processed in memory before being stored in temporary directories. Once all chunks are uploaded, they are merged into a single file.

##### Configuration Options

The following settings can be used when configuring file uploads:

| Property | Type    | Description                                         | Default  |
| -------- | ------- | --------------------------------------------------- | -------- |
| maxSize  | string  | Maximum allowed size for each chunk (e.g., `"5MB"`) | No limit |
| required | boolean | Whether the file is mandatory for the request       | `false`  |

##### Expected Request Format

The client must send the following fields in the `multipart/form-data` request:

| Field         | Type   | Description                              |
| ------------- | ------ | ---------------------------------------- |
| `file`        | File   | The chunked file data                    |
| `filename`    | String | Name of the original file                |
| `uniqueID`    | String | Unique identifier for the upload session |
| `chunkIndex`  | Number | Current chunk number (0-based index)     |
| `totalChunks` | Number | Total number of chunks for the file      |

##### Middleware Output

The middleware adds a `multipartFile` object to the `req` object, which contains information about the uploaded file.

##### When all chunks are not yet received, req.multipartFile has the below JSON:

```json
{
  "isPending": true,
  "originalname": "example.pdf",
  "uniqueID": "abc123",
  "chunkIndex": 2,
  "totalChunks": 5
}
```

##### When the upload is complete, req.multipartFile has the below JSON:

```json
{
  "isPending": false,
  "originalname": "example.pdf",
  "uniqueID": "abc123",
  "filePath": "/uploads/completed_files/abc123_example.pdf"
}
```

##### Example

```typescript
import { body } from 'express-validator';
import { Endpoint, middleware, AuthType, Method } from 'node-server-engine';

const fileConfig = { maxSize: '10MB', required: true };

new Endpoint({
  path: '/upload',
  method: Method.POST,
  authType: AuthType.JWT,
  multipartFile: fileConfig,
  handler: (req, res) => {
    console.log(req.multipartFile);
  }
});
```
---

### Socket Client

The socket server start if the [Server](#server)'s webSocket option is not undefined.

Each time a new socket connection is established, a new instance of `SocketClient` is created.

#### Socket Client Options

Options can be set for SocketClient when setting up a Server instance.

| Parameter         | Type                                       | Description                                                             | Default      |
| ----------------- | ------------------------------------------ | ----------------------------------------------------------------------- | ------------ |
| handlers          | Array\<[MessageHandler](#message-handler)> | A list of message handlers to use                                       | **required** |
| authCallbacks     | Array\<function>                           | Callbacks called when a client successfully authenticates on the socket | []           |
| initCallbacks     | Array\<function>                           | Callbacks called when the socket client is created                      | []           |
| shutdownCallbacks | Array\<function>                           | Callbacks called when the socket client is destroyed                    | []           |

#### Properties

| Property      | Type    | Description                                                                                                            |
| ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| id            | String  | A unique identifier for the connection                                                                                 |
| ws            | Object  | The socket being used. Instance of [WebSocket](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket) |
| authenticated | Boolean | Flag indicating that the current user is authenticated                                                                 |
| userId        | String  | Id of the current user **(available when authenticated)**                                                              |

---

### Message Handler

Message handler are similar to [Endpoint](#endpoint), but in a WebSocket context. They define how incoming messages should be handled.

```javascript
import { MessageHandler, Server } from 'node-server-engine';

function handler(payload, client) {
  // payload is the message payload in a standard message.
  // client is an instance of SocketClient
}

const messageHandler = new MessageHandler(type, handler, options);

new Server({
  webSocket: { client: { handlers: [messageHandler] } }
});
```

| Argument              | Type                                                                                 | Description                                             | Default      |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- | ------------ |
| type                  | String                                                                               | The message type that should be handled                 | **required** |
| handler               | Function                                                                             | A function that will run for every message of this type | **required** |
| options.authenticated | A flag indicating that this kind of message handling require an authenticated client | `true`                                                  |

---

### Redis

The server engine exposes a Redis client that is configured to work with the standard environment variables that are used in our services.

It is a pre-configured instance of [ioredis](https://github.com/luin/ioredis). See the package documentation for more details.

```javascript
import { Redis } from 'node-server-engine';

await Redis.set(key, value);
```

It can be configured through environment variables

| env            | description                                                                        | default |
| -------------- | ---------------------------------------------------------------------------------- | ------- |
| REDIS_HOST     | Host to which to connecto to                                                       |         |
| REDIS_PORT     | Port on which redis is served                                                      |         |
| REDIS_PASSWORD | Password used to authenticate with the server                                      |         |
| REDIS_CLUSTER  | Flag indicating that redis is configured as a cluster and not as a single instance | false   |

---

### Sequelize

The server engine exposes an SQL ORM that is configured to work with the standard environment variables that are used in our services.

It is a pre-configured instance of [sequelize](https://github.com/sequelize/sequelize). See the package documentation for more details.

```javascript
import { Sequelize } from 'node-server-engine';

Sequelize.sequelize;
Sequelize.closeSequelize();
```

It can be configured through environment variables

| env          | description                                       | default  |
| ------------ | ------------------------------------------------- | -------- |
| SQL_HOST     | Host to which connect to                          |          |
| SQL_PORT     | Port on which SQL is served                       | 5432     |
| SQL_PASSWORD | Password used to authenticate with the SQL server |          |
| SQL_USER     | User used to authenticate with the SQL server     |          |
| SQL_DB       | Database to which connect to                      |          |
| SQL_TYPE     | SQL type which connect to                         | postgres |

---

### Pub/Sub

The engine exposes a `PubSub` entity that can be used to communicate with Google Cloud Pub/Sub.

```javascript
import { PubSub } from 'node-server-engine';

/**
 * Declare that the service will be publishing to a topic
 * This must be done before init() is called
 * Any attempt to publish a message without declaring a topic first will fail
 * @property {string|Array.<string>} topic - The topic(s) to which we will be publishing
 */
PubSub.addPublisher(topic);

/**
 * Binds a message handle to a subscription
 * If called multiple times, handlers will be chained
 * This must be done before init() is called
 * The subscription will not be consumed until init() is called
 * @property {string} subscription - The subscription to consume
 * @property {function|Array.<function>} handler - The message handling function(s)
 * @property {boolean} [first] - Puts the handler(s) at the beginning of the handling chain (default: false)
 */
PubSub.addSubscriber(subscription, handler, first);

/**
 * Establish connection with all the declared publishers/subscribers
 */
await PubSub.init();

/**
 * Send a message through a previously declared publisher
 * @property {string} topic - The name of the topic to which the message should be pushed
 * @property {Object} message - The actual message (will be JSON stringified)
 * @property {Object} [attributes] - Message attributes
 * @property {string} [orderingKey] - Ordering key
 */
await PubSub.publish(topic, message, attributes, orderingKey);

/**
 * Flush all pending messages and close connections with Pub/Sub
 */
await PubSub.shutdown();
```

---

### PushNotification

Communication interface with the push service.

```javascript
import { PushNotification } from 'node-server-engine';

// The entity needs to initialize it's pub/sub connections
// Handlers must be declared before this function is called
await PushNotification.init();

/**
 * Send a push notification through the push service
 * @param {String} userId - ID of the user that should receive the notification
 * @param {Object} notification - Notification that should be sent
 * @return {void}
 */
await PushNotification.sendPush(userId, notification);
```

---

### Localizator

The localizator exposes localization related utilities.

```javascript
import { Localizator } from 'node-server-engine';

// The synchronize init should be called first to initialize the data
// The localizator will regularly synchronize new data after that without any calls having to be made
await Localizator.init();

// Get the different ways of displaying a user's name
const { regular, formal, casual } = await Localizator.getDisplayNames(
  firstName,
  lastName,
  locale
);

// This should be call when the program shuts down.
await Localizator.shutdown();
```

| env         | description                               | default      |
| ----------- | ----------------------------------------- | ------------ |
| LOCALES_URL | Base URL where the locales data is stored | **required** |

---

### ElasticSearch

The ElasticSearch exposes a service related to data searching.

```javascript
import { ElasticSearch } from 'node-server-engine';

// The synchronize init should be called first to initialize the data
await ElasticSearch.init();

// This should be call when the program shuts down.
await ElasticSearch.shutdown();
```

| env                           | description                                    | default      |
| ----------------------------- | ---------------------------------------------- | ------------ |
| ELASTIC_SEARCH_MIGRATION_PATH | The path link to Elastic Search migration data | **required** |
| ELASTIC_SEARCH_HOST           | The elastic search host url                    | **required** |
| ELASTIC_SEARCH_USERNAME       | The elastic search user name                   | **required** |
| ELASTIC_SEARCH_PASSWORD       | The elastic search password                    | **required** |
| TLS_CA                        | CA for ssl config when available               |              |

---

### Translation Manager

The translation manager exposes translation related utilities.

```javascript
import { TranslationManager } from 'node-server-engine';

// The synchronize init should be called first to initialize the data
// The tranlsation manager will regularly synchronize new data after that without any calls having to be made
await TranslationManager.init();

// Get the different ways of displaying a user's name
const translatedString = await TranslationManager.translate(
  lang,
  key,
  variables,
  tags
);

// Example
const translatedString = await TranslationManager.translate(
  'zh-TW',
  'email.invitation.body',
  { name: 'John' },
  { link: ['a', 'href="https://www.test.com"'] }
);

// This should be call when the program shuts down.
await TranslationManager.shutdown();
```

- **lang** [String]: Locale for which the translation should be fetched (if no data is found, translation will be returned in `en-US`).
- **key** [String]: Translation key
- **variables** [Object]: A key=>value mapping for variable interpolation in strings. **(Optional)**
- **tags** [Object]: A key=>value mapping for variable interpolation in strings. **(Optional)**

| env         | description                               | default      |
| ----------- | ----------------------------------------- | ------------ |
| LOCALES_URL | Base URL where the locales data is stored | **required** |

---

### Error Reporting

The server engine standardizes the way errors are handled and reported. The error classes provided by the Server Engine should always be used when throwing an exception.

Errors are a crucial part of the application, they are what helps us to properly debug the program and offer support when need, as well as what exposes issues to the client.

#### Log Output Formats

The engine automatically adapts log output based on the environment:

**Local Development (Readable Format)**
- Colorized output with severity levels
- Formatted timestamps and file locations
- Pretty-printed data objects
- Stack traces with proper formatting
- HTTP request context when available

**Production/GCP (JSON Format)**
- Structured JSON for log aggregation
- Google Cloud Error Reporting integration
- Kubernetes pod information
- Service context metadata

**Control Log Format**

You can override the automatic detection:

```bash
# Force readable local format (useful for local Docker)
LOG_FORMAT=local npm start

# Force JSON format (useful for local testing)
LOG_FORMAT=json npm start
```

**Example Local Output:**
```
[2025-12-10T10:30:45.123Z] ERROR    src/endpoints/users.ts:42 User not found
  Error Code: user-not-found
  Status: 404
Data:
  {
    "userId": "abc-123",
    "requestId": "req-456"
  }
```

By standard, the client receives the following body when an error happens.

```javascript
// HTTP Status code (400 | 500)
{
  errorCode: "some-error", // Machine readable error code
  hint: "The selected user does not exist" // (optional) Hint for developers
}
```

Status codes should be limited to 400 for client errors and 500 for server errors. Other 4XX status codes should be avoided unless very specific cases (ex: authentication error).

All our custom error classes take a `data` parameter. This will be logged on the backend and should contain any data that can help to understand the runtime context or the error (ex: user's ID).

#### Common options

These options are common to each of the error classes described below.

| option   | definition                                                                                                              | example                         | default                        |
| -------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------ |
| message  | A message logged on the backend only                                                                                    | "Could not find user in the DB" | **required**                   |
| severity | The level at which this error should be logged                                                                          | [Severity](#severity).WARNING   | [Severity](#severity).CRITICAL |
| data     | Some data related to the error that will be logged on the backend. This should help to undetrstand the runtime context. | {userId: 'xf563ugh0'}           |                                |
| error    | An error object, when this is a wrapper around an existing error object                                                 |                                 |

#### Severity

Severity allows us to order errors by their impact on the program. It is important to set severity correctly as backend logs can include hundreds of entries per seconds, severity allows us to filter out the most important errors. An enumeration is exposed that includes all the severity levels, as described in the following table.

##### Log Levels

| severity  | definition                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| DEBUG     | Detailed information of the runtime execution. Used for debugging.                                                       |
| INFO      | Base information level of runtime information.                                                                           |
| WARNING   | Errors that are expected to happen and do not cause any particular issue. (ex: a client made an unauthenticated request) |
| CRITICAL  | Errors that are unexpected and cause an improper behavior. (ex: failed to store some data in the DB)                     |
| EMERGENCY | Errors that prevent the program from running. (ex: some environment variables are not correctly set)                     |

#### EngineError

This error class represents errors that happen withing the Server Engine. They should be used for server configuration errors, or unexpected behaviors. They will always return `500 - {errorCode: 'server-error'}`.

```javascript
import { EngineError, Severity } from 'node-server-engine';

if (!process.env.IMPORTANT_VARIABLE) {
  throw new EngineError(options);
}
```

Engine Errors strictly follow the [common options](#common-options).

#### WebError

This error class represents errors that happen at runtime and that need specific reporting to the client. Their definition is more complex, but it includes additional data specific to the client.

```javascript
import { WebError, Severity } from 'node-server-engine';

const user = User.findOne({ where: { id: userId } });
if (!user) {
  throw new WebError(options);
}
```

In addition to the [common options](#common-options), WebError defines some other options specific for error reporting to clients.

| option     | definition                                                       | example      | default      |
| ---------- | ---------------------------------------------------------------- | ------------ | ------------ |
| errorCode  | A machine readable error code that will be parsed by the client. | unknown-user | **required** |
| statusCode | HTTP status code of the response.                                | 400          | 500          |
| hint       | A human readable error message that is intended for developers   |              |

## Middlewares

Server engine exposes a bunch of middlewares. These can be imported to your project and used globally or per endpoint.

### Swagger Docs

This middleware allows the service to connect with the [API Documentation Service](https://github.com/prakashmahendran/api-documentation-service). It exposes the necessary endpoint for the documentation of this API to be visible by the Documentation Service.

```javascript
import { Server, middleware } from 'node-server-engine';

new Server({
  globalMiddleware: [middleware.swaggerDocs()]
});
```

#### Structuring Documentation

The underlying system used is the [Open API](https://swagger.io/specification/) spec.
Most of the data is already generate by the documentation service. The only real need is to document endpoints.

Endpoints should be documented in YAML files that respect the `**/*.docs.yaml` convention. It is recommended to place them in the same directory as the endpoint definition. Endpoint documentation has to follow the [path object spec](https://swagger.io/specification/#paths-object) from Open API.

```yaml
/hello:
  get:
    description: Request the API to say Hello
    responses:
      '200':
        description: Replies hello
        content:
          application/json:
            schema:
              type: Object
              properties:
                says:
                  type: string
                  example: Hello
```

#### Schemas and Responses

To avoid repeating the same structure across the documentation manually, one can use [schemas and responses components](https://swagger.io/docs/specification/components/).

Some common components are already defined directly in the API Documentation Service, please check its documentation to avoid repeats.

If you ever need to declare custom components, they simply must follow the architecture bellow.

```bash
# Repository root
/src
  /docs
    /responses
      - coolResponse.yaml
    / schemas
      - bestSchema.yaml
```

Here is an example definition:

```yaml
Dog:
  type: object
  properties:
    name:
      type: string
      example: Rex
    owner:
      type: string
      example: f1982af0-1579-4c56-a138-de1ab4ff39b3
    isAGoodBoy:
      type: boolean
      example: true
  required:
    - name
    - owner
```

---

### User Resolver

`/!\` **Must be used in combination with AuthType.JWT**

Resolves the user making the request with the user resolver. The user's complete data is added to `req.user`.

```javascript
import { Endpoint, middleware, AuthType, Method } from 'node-server-engine';

new Endpoint({
  path: '/hello',
  method: Method.GET,
  authType: AuthType.JWT,
  middleware: [middleware.userResolver],
  handler: (req, res) => {
    res.json({ say: `Hello ${req.user.firstName}` });
  }
});
```

---

### Gemini File Upload

An endpoint can upload a file to a google gemini AI

The request must be made as `multipart/form-data`.

File should be uploaded under the key file.

The file's data will be available at `req.body.fileUri req.body.mimeType  req.body.originalname`

---

### Check Permission Middleware

/!\ **Must be used in combination with AuthType.JWT**

Checks if the user has at least one of the required permissions. The permissions are case-insensitive.

```javascript
import { Endpoint, middleware, AuthType, Method } from 'node-server-engine';

new Endpoint({
  path: '/admin',
  method: Method.GET,
  authType: AuthType.JWT,
  middleware: [middleware.checkPermission(['admin', 'superuser'])],
  handler: (req, res) => {
    res.json({ message: 'Access granted' });
  }
});
```

```typescript
import { Request, Response, NextFunction } from 'express';

// Middleware to check if the user has at least one of the required permissions (case-insensitive)
export const checkPermission = (requiredActions: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user || !user.permissions) {
      return res
        .status(403)
        .json({ message: 'User does not have permissions' });
    }

    const requiredActionsArray = Array.isArray(requiredActions)
      ? requiredActions
      : [requiredActions];

    const requiredActionsLower = requiredActionsArray.map((action) =>
      action.toLowerCase()
    );

    const hasPermission = user.permissions.some((permission: string) =>
      requiredActionsLower.includes(permission.toLowerCase())
    );

    if (!hasPermission) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    next();
  };
};
```

## Utilities

The server engine ships with a handful of utility functions that are commonly used by servers

### Request

This function is a wrapper around [axios](https://github.com/axios/axios). It adds proper error handling for reporting in the logs when a network call fails. It should be used for any requests made by a service.
Refer to the [axios documentation](https://github.com/axios/axios) for the request configuration.

```javascript
import { request } from 'node-server-engine';
const { data } = await request({
  method: 'get',
  url: 'https://www.google.com'
});
```

---

### TLS Request

This function is a wrapper around [request](#request). It adds the necessary configuration to easily make requests with TLS. The settings used are based on the environment variables. It will use request specific certificate/key if defined, or will fallback to use the same ones as the ones used for the server.

It is necessary to use this function when calling other services in the cluster. Requests could fail otherwise as the common CA is not set and the client certificate not exposed.

```javascript
import { tlsRequest } from 'node-server-engine';
const { data } = await tlsRequest({
  method: 'get',
  url: 'https://www.google.com'
});
```

---

### TLS Config

The server's TLS configuration can be fetched as an object. Alternatively, the server engine also exposes an [HTTPS Agent](https://nodejs.org/api/https.html#https_class_https_agent). They will not be available at startup, so it is important that the function calling them loads them first if they are not present.

```javascript
import {tlsConfig, httpsAgent, loadTlsConfig} from 'node-server-engine';
import https from 'https';

// TLS Config
if(!tlsConfig) loadTlsConfig();
const customAgent = new https.Agent({
  key: tlsConfig.key,
  cert: tlsConfig.cert,
  ca: tlsConfig.ca,
  passphrase: tlsConfig.passphrase,
});

// HTTPS Agent
if(!httpsAgent) loadTlsConfig();
https.request('https://www.google.com'. {agent: httpsAgent});
```

---

### Send Push Notification

Send a push notification through the push service.

```javascript
import { sendPush } from 'node-server-engine';
await sendPush(userId, notification);
```

| parameter    | description                                                              |
| ------------ | ------------------------------------------------------------------------ |
| userId       | ID of the user that should receive the notification                      |
| notification | Content of the notification as defined by the push service documentation |

---

### Send Email

Send an email using the SMTP configuration.

```javascript
import { sendEmail } from 'node-server-engine';

const emailOptions = {
  to: 'recipient@example.com',
  subject: 'Welcome to our service!',
  text: 'Hello, welcome to our platform!',
  html: '<h1>Welcome</h1><p>Glad to have you onboard!</p>',
  attachments: [
    {
      filename: 'welcome.txt',
      content: 'Welcome to our service!'
    }
  ]
};

const result = await sendEmail(emailOptions);
console.log(result.status); // 'sent', 'delivered', 'queued', or 'failed'
```

### Parameters

| Parameter     | Description                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| `from`        | (Optional) Sender's email address. Defaults to the authenticated email.                                           |
| `to`          | Email recipient(s) as a string or array of strings.                                                               |
| `cc`          | (Optional) Carbon Copy recipients (string or array).                                                              |
| `bcc`         | (Optional) Blind Carbon Copy recipients (string or array).                                                        |
| `subject`     | Subject of the email.                                                                                             |
| `text`        | (Optional) Plain text version of the email body.                                                                  |
| `html`        | (Optional) HTML version of the email body.                                                                        |
| `attachments` | (Optional) Array of attachments. Each attachment can include `filename`, `content`, `path`, and other properties. |
| `replyTo`     | (Optional) Email address for replies.                                                                             |
| `headers`     | (Optional) Custom email headers.                                                                                  |
| `priority`    | (Optional) Email priority (`high`, `normal`, or `low`).                                                           |

### Return Status

The function returns an object with the following status options:

| Status      | Description                                                             |
| ----------- | ----------------------------------------------------------------------- |
| `sent`      | Email was successfully sent but delivery confirmation is not available. |
| `delivered` | Email was successfully delivered.                                       |
| `queued`    | Email is queued for delivery but not yet sent.                          |
| `failed`    | Email could not be sent due to an error.                                |

---

### Gemini File Upload

Upload a file to Google Gemini AI.

```javascript
import { geminiFileUpload } from 'node-server-engine';

const fileBuffer = fs.readFileSync('example.pdf');
const mimeType = 'application/pdf';
const originalName = 'example.pdf';

const result = await geminiFileUpload(fileBuffer, mimeType, originalName);

if (result.success) {
  console.log('File uploaded successfully:', result.fileUri);
} else {
  console.error('File upload failed:', result.error);
}
```

### Parameters

| Parameter      | Type     | Description                                                       |
| -------------- | -------- | ----------------------------------------------------------------- |
| `buffer`       | `Buffer` | The file content in buffer format.                                |
| `mimeType`     | `string` | The MIME type of the file (e.g., `image/png`, `application/pdf`). |
| `originalName` | `string` | The original filename, including the extension.                   |

### Response

The function returns an object with one of the following structures:

#### **Success Response**

```json
{
  "success": true,
  "originalname": "example.pdf",
  "fileUri": "https://gemini.googleapis.com/file/xyz123",
  "mimeType": "application/pdf"
}
```

#### **Failure Response**

```json
{
  "success": false,
  "error": "Error message"
}
```

### Return Fields

| Field          | Type      | Description                                                       |
| -------------- | --------- | ----------------------------------------------------------------- |
| `success`      | `boolean` | Indicates whether the upload was successful.                      |
| `originalname` | `string`  | The name of the uploaded file.                                    |
| `fileUri`      | `string`  | The URI of the uploaded file on Google Gemini AI.                 |
| `mimeType`     | `string`  | The MIME type of the uploaded file.                               |
| `error`        | `any`     | Present only if `success` is `false`. Contains the error details. |

### Error Handling

- If the `GOOGLE_AI_KEY` environment variable is missing, the function throws an error.
- If the upload fails or the file processing does not complete successfully, an error response is returned.
- Temporary files are cleaned up after the upload process to prevent storage issues.

---

### Filter

Apply a filter on an object. It returns a copy of the object that only holds the whitelisted keys.

This is particularly useful to sanitize objects before returning them to clients.

```javascript
import { filter } from 'node-server-engine';

const object = { a: 'kept', b: 'not kept' };
const whitelist = ['a'];

const result = filter(object.whitelist);
// result = {a: 'kept'}
```

---

### Database Migration

Some utilities are exposed to handle database migrations.

`runPendingMigrations` will execute all the migration scripts that have not yet been executed.

`rollbackMigrations` will rollback all the migrations that have been executed with the current version of the app and after.

```javascript
import { runPendingMigrations } from 'node-server-engine';
import { rollbackMigrations } from 'node-server-engine';

await runPendingMigrations();

await rollbackMigrations();
```

---

### Environment Variables Verification

Environment variables verification can be done through the [Server](#server)'s checkEnvironment setting. It is an object defining how environment variables should be verified.

```javascript
import { envAssert } from 'node-server-engine';

export const checkEnvironment = {
  ENV_VAR: envAssert.isString()
};
```

#### Assertions Available

The sever engine makes available a utility for environment variables assertions calls `envAssert`. The following example shows the different assertions that are possible.

<!-- markdownlint-disable MD033 -->

| Validator                              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **isAfter(date])**                     | check if the string is a date that's after the specified date (defaults to now).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **isAlpha(locale, options])**          | check if the string contains only letters (a-zA-Z).<br/><br/>Locale is one of `['ar', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-QA', 'ar-QM', 'ar-SA', 'ar-SD', 'ar-SY', 'ar-TN', 'ar-YE', 'bg-BG', 'cs-CZ', 'da-DK', 'de-DE', 'el-GR', 'en-AU', 'en-GB', 'en-HK', 'en-IN', 'en-NZ', 'en-US', 'en-ZA', 'en-ZM', 'es-ES', 'fr-FR', 'fa-IR', 'he', 'hu-HU', 'it-IT', 'ku-IQ', 'nb-NO', 'nl-NL', 'nn-NO', 'pl-PL', 'pt-BR', 'pt-PT', 'ru-RU', 'sl-SI', 'sk-SK', 'sr-RS', 'sr-RS@latin', 'sv-SE', 'tr-TR', 'uk-UA']`) and defaults to `en-US`. Locale list is `validator.isAlphaLocales`. options is an optional object that can be supplied with the following key(s): ignore which can either be a String or RegExp of characters to be ignored e.g. " -" will ignore spaces and -'s.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **isAlphanumeric(locale])**            | check if the string contains only letters and numbers.<br/><br/>Locale is one of `['ar', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-QA', 'ar-QM', 'ar-SA', 'ar-SD', 'ar-SY', 'ar-TN', 'ar-YE', 'bg-BG', 'cs-CZ', 'da-DK', 'de-DE', 'el-GR', 'en-AU', 'en-GB', 'en-HK', 'en-IN', 'en-NZ', 'en-US', 'en-ZA', 'en-ZM', 'es-ES', 'fr-FR', 'fa-IR', 'he', 'hu-HU', 'it-IT', 'ku-IQ', 'nb-NO', 'nl-NL', 'nn-NO', 'pl-PL', 'pt-BR', 'pt-PT', 'ru-RU', 'sl-SI', 'sk-SK', 'sr-RS', 'sr-RS@latin', 'sv-SE', 'tr-TR', 'uk-UA']`) and defaults to `en-US`. Locale list is `validator.isAlphanumericLocales`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **isAscii()**                          | check if the string contains ASCII chars only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **isBase32()**                         | check if a string is base32 encoded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **isBase58()**                         | check if a string is base58 encoded.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **isBase64(options])**                 | check if a string is base64 encoded. options is optional and defaults to `{urlSafe: false}`<br/> when `urlSafe` is true it tests the given base64 encoded string is [url safe](https://base64.guru/standards/base64url)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **isBefore(date])**                    | check if the string is a date that's before the specified date.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **isBIC()**                            | check if a string is a BIC (Bank Identification Code) or SWIFT code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **isBoolean()**                        | check if a string is a boolean.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **isBtcAddress()**                     | check if the string is a valid BTC address.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **isByteLength(options])**             | check if the string's length (in UTF-8 bytes) falls in a range.<br/><br/>`options` is an object which defaults to `{min:0, max: undefined}`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **isCreditCard()**                     | check if the string is a credit card.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **isCurrency(options])**               | check if the string is a valid currency amount.<br/><br/>`options` is an object which defaults to `{symbol: '$', require_symbol: false, allow_space_after_symbol: false, symbol_after_digits: false, allow_negatives: true, parens_for_negatives: false, negative_sign_before_digits: false, negative_sign_after_digits: false, allow_negative_sign_placeholder: false, thousands_separator: ',', decimal_separator: '.', allow_decimal: true, require_decimal: false, digits_after_decimal: [2], allow_space_after_digits: false}`.<br/>**Note:** The array `digits_after_decimal` is filled with the exact number of digits allowed not a range, for example a range 1 to 3 will be given as [1, 2, 3].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **isDataURI()**                        | check if the string is a [data uri format](https://developer.mozilla.org/en-US/docs/Web/HTTP/data_URIs).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **isDate(input [, options])**          | Check if the input is a valid date. e.g. [`2002-07-15`, new Date()].<br/><br/> `options` is an object which can contain the keys `format`, `strictMode` and/or `delimiters`<br/><br/>`format` is a string and defaults to `YYYY/MM/DD`.<br/><br/>`strictMode` is a boolean and defaults to `false`. If `strictMode` is set to true, the validator will reject inputs different from `format`.<br/><br/> `delimiters` is an array of allowed date delimiters and defaults to `['/', '-']`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **isDecimal(options])**                | check if the string represents a decimal number, such as 0.1, .3, 1.1, 1.00003, 4.0, etc.<br/><br/>`options` is an object which defaults to `{force_decimal: false, decimal_digits: '1,', locale: 'en-US'}`<br/><br/>`locale` determine the decimal separator and is one of `['ar', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-QA', 'ar-QM', 'ar-SA', 'ar-SD', 'ar-SY', 'ar-TN', 'ar-YE', 'bg-BG', 'cs-CZ', 'da-DK', 'de-DE', 'el-GR', 'en-AU', 'en-GB', 'en-HK', 'en-IN', 'en-NZ', 'en-US', 'en-ZA', 'en-ZM', 'es-ES', 'fa', 'fa-AF', 'fa-IR', 'fr-FR', 'hu-HU', 'id-ID', 'it-IT', 'ku-IQ', 'nb-NO', 'nl-NL', 'nn-NO', 'pl-PL', 'pl-Pl', 'pt-BR', 'pt-PT', 'ru-RU', 'sl-SI', 'sr-RS', 'sr-RS@latin', 'sv-SE', 'tr-TR', 'uk-UA', 'vi-VN']`.<br/>**Note:** `decimal_digits` is given as a range like '1,3', a specific value like '3' or min like '1,'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **isDivisibleBy(number)**              | check if the string is a number that's divisible by another.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **isEAN()**                            | check if the string is an EAN (European Article Number).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **isEmail(options])**                  | check if the string is an email.<br/><br/>`options` is an object which defaults to `{ allow_display_name: false, require_display_name: false, allow_utf8_local_part: true, require_tld: true, allow_ip_domain: false, domain_specific_validation: false, blacklisted_chars: '' }`. If `allow_display_name` is set to true, the validator will also match `Display Name <email-address>`. If `require_display_name` is set to true, the validator will reject strings without the format `Display Name <email-address>`. If `allow_utf8_local_part` is set to false, the validator will not allow any non-English UTF8 character in email address' local part. If `require_tld` is set to false, e-mail addresses without having TLD in their domain will also be matched. If `ignore_max_length` is set to true, the validator will not check for the standard max length of an email. If `allow_ip_domain` is set to true, the validator will allow IP addresses in the host part. If `domain_specific_validation` is true, some additional validation will be enabled, e.g. disallowing certain syntactically valid email addresses that are rejected by GMail. If `blacklisted_chars` recieves a string,then the validator will reject emails that include any of the characters in the string, in the name part.                                                                                                                                                                                                                                                                                |
| **isEmpty(options])**                  | check if the string has a length of zero.<br/><br/>`options` is an object which defaults to `{ ignore_whitespace:false }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **isEthereumAddress()**                | check if the string is an [Ethereum](https://ethereum.org/) address using basic regex. Does not validate address checksums.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **isFloat(options])**                  | check if the string is a float.<br/><br/>`options` is an object which can contain the keys `min`, `max`, `gt`, and/or `lt` to validate the float is within boundaries (e.g. `{ min: 7.22, max: 9.55 }`) it also has `locale` as an option.<br/><br/>`min` and `max` are equivalent to 'greater or equal' and 'less or equal', respectively while `gt` and `lt` are their strict counterparts.<br/><br/>`locale` determine the decimal separator and is one of `['ar', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-QA', 'ar-QM', 'ar-SA', 'ar-SD', 'ar-SY', 'ar-TN', 'ar-YE', 'bg-BG', 'cs-CZ', 'da-DK', 'de-DE', 'en-AU', 'en-GB', 'en-HK', 'en-IN', 'en-NZ', 'en-US', 'en-ZA', 'en-ZM', 'es-ES', 'fr-FR', 'hu-HU', 'it-IT', 'nb-NO', 'nl-NL', 'nn-NO', 'pl-PL', 'pt-BR', 'pt-PT', 'ru-RU', 'sl-SI', 'sr-RS', 'sr-RS@latin', 'sv-SE', 'tr-TR', 'uk-UA']`. Locale list is `validator.isFloatLocales`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **isFQDN(options])**                   | check if the string is a fully qualified domain name (e.g. domain.com).<br/><br/>`options` is an object which defaults to `{ require_tld: true, allow_underscores: false, allow_trailing_dot: false , allow_numeric_tld: false }`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **isFullWidth()**                      | check if the string contains any full-width chars.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **isHalfWidth()**                      | check if the string contains any half-width chars.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **isHash(algorithm)**                  | check if the string is a hash of type algorithm.<br/><br/>Algorithm is one of `['md4', 'md5', 'sha1', 'sha256', 'sha384', 'sha512', 'ripemd128', 'ripemd160', 'tiger128', 'tiger160', 'tiger192', 'crc32', 'crc32b']`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **isHexadecimal()**                    | check if the string is a hexadecimal number.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **isHexColor()**                       | check if the string is a hexadecimal color.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **isHost()**                           | check if the string is a server host name.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **isHostList()**                       | check if the string is a comma separated list of server host name.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **isHSL()**                            | check if the string is an HSL (hue, saturation, lightness, optional alpha) color based on [CSS Colors Level 4 specification](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).<br/><br/>Comma-separated format supported. Space-separated format supported with the exception of a few edge cases (ex: `hsl(200grad+.1%62%/1)`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **isIBAN()**                           | check if a string is a IBAN (International Bank Account Number).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **isIdentityCard(locale])**            | check if the string is a valid identity card code.<br/><br/>`locale` is one of `['ES', 'IN', 'IT', 'NO', 'zh-TW', 'he-IL', 'ar-TN', 'zh-CN']` OR `'any'`. If 'any' is used, function will check if any of the locals match.<br/><br/>Defaults to 'any'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **isIMEI(options]))**                  | check if the string is a valid IMEI number. Imei should be of format `###############` or `##-######-######-#`.<br/><br/>`options` is an object which can contain the keys `allow_hyphens`. Defaults to first format . If allow_hyphens is set to true, the validator will validate the second format.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **isIn(values)**                       | check if the string is in a array of allowed values.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **isInt(options])**                    | check if the string is an integer.<br/><br/>`options` is an object which can contain the keys `min` and/or `max` to check the integer is within boundaries (e.g. `{ min: 10, max: 99 }`). `options` can also contain the key `allow_leading_zeroes`, which when set to false will disallow integer values with leading zeroes (e.g. `{ allow_leading_zeroes: false }`). Finally, `options` can contain the keys `gt` and/or `lt` which will enforce integers being greater than or less than, respectively, the value provided (e.g. `{gt: 1, lt: 4}` for a number between 1 and 4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **isIP(version])**                     | check if the string is an IP (version 4 or 6).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **isIPList()**                         | check if the string is a comma separated list of IP addresses (version 4 or 6).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **isIPRange()**                        | check if the string is an IP Range(version 4 only).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **isISBN(version])**                   | check if the string is an ISBN (version 10 or 13).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **isISIN()**                           | check if the string is an [ISIN][isin] (stock/security identifier).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **isISO8601()**                        | check if the string is a valid [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) date; for additional checks for valid dates, e.g. invalidates dates like `2009-02-29`, pass `options` object as a second parameter with `options.strict = true`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **isISO31661Alpha2()**                 | check if the string is a valid [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) officially assigned country code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **isISO31661Alpha3()**                 | check if the string is a valid [ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) officially assigned country code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **isISRC()**                           | check if the string is a [ISRC](https://en.wikipedia.org/wiki/International_Standard_Recording_Code).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **isISSN(options])**                   | check if the string is an [ISSN](https://en.wikipedia.org/wiki/International_Standard_Serial_Number).<br/><br/>`options` is an object which defaults to `{ case_sensitive: false, require_hyphen: false }`. If `case_sensitive` is true, ISSNs with a lowercase `'x'` as the check digit are rejected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **isJSON(options])**                   | check if the string is valid JSON (note: uses JSON.parse).<br/><br/>`options` is an object which defaults to `{ allow_primitives: false }`. If `allow_primitives` is true, the primitives 'true', 'false' and 'null' are accepted as valid JSON values.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **isJWT()**                            | check if the string is valid JWT token.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **isLatLong(options])**                | check if the string is a valid latitude-longitude coordinate in the format `lat,long` or `lat, long`.<br/><br/>`options` is an object that defaults to `{ checkDMS: false }`. Pass `checkDMS` as `true` to validate DMS(degrees, minutes, and seconds) latitude-longitude format.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **isLength(options])**                 | check if the string's length falls in a range.<br/><br/>`options` is an object which defaults to `{min:0, max: undefined}`. Note: this function takes into account surrogate pairs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **isLocale()**                         | check if the string is a locale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **isLowercase()**                      | check if the string is lowercase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **isMACAddress()**                     | check if the string is a MAC address.<br/><br/>`options` is an object which defaults to `{no_colons: false}`. If `no_colons` is true, the validator will allow MAC addresses without the colons. Also, it allows the use of hyphens, spaces or dots e.g '01 02 03 04 05 ab', '01-02-03-04-05-ab' or '0102.0304.05ab'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **isMagnetURI()**                      | check if the string is a [magnet uri format](https://en.wikipedia.org/wiki/Magnet_URI_scheme).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **isMD5()**                            | check if the string is a MD5 hash.<br/><br/>Please note that you can also use the `isHash('md5')` function. Keep in mind that MD5 has some collision weaknesses compared to other algorithms (e.g., SHA).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **isMimeType()**                       | check if the string matches to a valid [MIME type](https://en.wikipedia.org/wiki/Media_type) format                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **isMobilePhone(locale [, options]])** | check if the string is a mobile phone number,<br/><br/>(locale is either an array of locales (e.g `['sk-SK', 'sr-RS']`) OR one of `['am-Am', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', ar-JO', 'ar-KW', 'ar-MA', 'ar-SA', 'ar-SY', 'ar-TN', 'az-AZ', 'az-LY', 'az-LB', 'bs-BA', 'be-BY', 'bg-BG', 'bn-BD', 'ca-AD', 'cs-CZ', 'da-DK', 'de-DE', 'de-AT', 'de-CH', 'de-LU', 'el-GR', 'en-AU', 'en-CA', 'en-GB', 'en-GG', 'en-GH', 'en-HK', 'en-MO', 'en-IE', 'en-IN', 'en-KE', 'en-MT', 'en-MU', 'en-NG', 'en-NZ', 'en-PK', 'en-PH', 'en-RW', 'en-SG', 'en-SL', 'en-UG', 'en-US', 'en-TZ', 'en-ZA', 'en-ZM', 'en-ZW', 'es-AR', 'es-BO', 'es-CL', 'es-CO', 'es-CR', 'es-DO', 'es-HN', 'es-PE', 'es-EC', 'es-ES', 'es-MX', 'es-PA', 'es-PY', 'es-UY', 'et-EE', 'fa-IR', 'fi-FI', 'fj-FJ', 'fo-FO', 'fr-BE', 'fr-FR', 'fr-GF', 'fr-GP', 'fr-MQ', 'fr-RE', 'ga-IE', 'he-IL', 'hu-HU', 'id-ID', 'it-IT', 'it-SM', 'ja-JP', 'ka-GE', 'kk-KZ', 'kl-GL', 'ko-KR', 'lt-LT', 'ms-MY', 'nb-NO', 'ne-NP', 'nl-BE', 'nl-NL', 'nn-NO', 'pl-PL', 'pt-BR', 'pt-PT', 'ro-RO', 'ru-RU', 'sl-SI', 'sk-SK', 'sq-AL', 'sr-RS', 'sv-SE', 'th-TH', 'tr-TR', 'uk-UA', 'uz-UZ', 'vi-VN', 'zh-CN', 'zh-HK', 'zh-MO', 'zh-TW']` OR defaults to 'any'. If 'any' or a falsey value is used, function will check if any of the locales match).<br/><br/>`options` is an optional object that can be supplied with the following keys: `strictMode`, if this is set to `true`, the mobile phone number must be supplied with the country code and therefore must start with `+`. Locale list is `validator.isMobilePhoneLocales`. |
| **isMongoId()**                        | check if the string is a valid hex-encoded representation of a [MongoDB ObjectId][mongoid].                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **isMultibyte()**                      | check if the string contains one or more multi-byte chars.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **isNumber**                           | check if the string contains only numbers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **isNumeric(options])**                | check if the string contains only numbers.<br/><br/>`options` is an object which defaults to `{no_symbols: false}` it also has locale as an option. If `no_symbols` is true, the validator will reject numeric strings that feature a symbol (e.g. `+`, `-`, or `.`).<br/><br/>`locale` determine the decimal separator and is one of `['ar', 'ar-AE', 'ar-BH', 'ar-DZ', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-QA', 'ar-QM', 'ar-SA', 'ar-SD', 'ar-SY', 'ar-TN', 'ar-YE', 'bg-BG', 'cs-CZ', 'da-DK', 'de-DE', 'en-AU', 'en-GB', 'en-HK', 'en-IN', 'en-NZ', 'en-US', 'en-ZA', 'en-ZM', 'es-ES', 'fr-FR', 'hu-HU', 'it-IT', 'nb-NO', 'nl-NL', 'nn-NO', 'pl-PL', 'pt-BR', 'pt-PT', 'ru-RU', 'sl-SI', 'sr-RS', 'sr-RS@latin', 'sv-SE', 'tr-TR', 'uk-UA']`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **isOctal()**                          | check if the string is a valid octal number.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **isPath()**                           | check if the string is a valid path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **isPassportNumber(countryCode)**      | check if the string is a valid passport number.<br/><br/>(countryCode is one of `[ 'AM', 'AR', 'AT', 'AU', 'BE', 'BG', 'BY', 'CA', 'CH', 'CN', 'CY', 'CZ', 'DE', 'DK', 'DZ', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE' 'IN', 'IS', 'IT', 'JP', 'KR', 'LT', 'LU', 'LV', 'MT', 'NL', 'PO', 'PT', 'RO', 'RU', 'SE', 'SL', 'SK', 'TR', 'UA', 'US' ]`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **isPort()**                           | check if the string is a valid port number.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **isPostalCode(locale)**               | check if the string is a postal code,<br/><br/>(locale is one of `[ 'AD', 'AT', 'AU', 'AZ', 'BE', 'BG', 'BR', 'BY', 'CA', 'CH', 'CZ', 'DE', 'DK', 'DO', 'DZ', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HT', 'HU', 'ID', 'IE' 'IL', 'IN', 'IR', 'IS', 'IT', 'JP', 'KE', 'LI', 'LT', 'LU', 'LV', 'MT', 'MX', 'MY', 'NL', 'NO', 'NP', 'NZ', 'PL', 'PR', 'PT', 'RO', 'RU', 'SA', 'SE', 'SG', 'SI', 'TH', 'TN', 'TW', 'UA', 'US', 'ZA', 'ZM' ]` OR 'any'. If 'any' is used, function will check if any of the locals match. Locale list is `validator.isPostalCodeLocales`.).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **isRFC3339()**                        | check if the string is a valid [RFC 3339](https://tools.ietf.org/html/rfc3339) date.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **isRgbColor(includePercentValues])**  | check if the string is a rgb or rgba color.<br/><br/>`includePercentValues` defaults to `true`. If you don't want to allow to set `rgb` or `rgba` values with percents, like `rgb(5%,5%,5%)`, or `rgba(90%,90%,90%,.3)`, then set it to false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **isSemVer()**                         | check if the string is a Semantic Versioning Specification (SemVer).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **isString()**                         | check if the string is a string.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **isStringList()**                     | check if the string is a comma separated list of string.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **isSurrogatePair()**                  | check if the string contains any surrogate pairs chars.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **isUppercase()**                      | check if the string is uppercase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **isSlug**                             | Check if the string is of type slug. `Options` allow a single hyphen between string. e.g. [`cn-cn`, `cn-c-c`]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **isStrongPassword(options])**         | Check if a password is strong or not. Allows for custom requirements or scoring rules. If `returnScore` is true, then the function returns an integer score for the password rather than a boolean.<br/>Default options: <br/>`{ minLength: 8, minLowercase: 1, minUppercase: 1, minNumbers: 1, minSymbols: 1, returnScore: false, pointsPerUnique: 1, pointsPerRepeat: 0.5, pointsForContainingLower: 10, pointsForContainingUpper: 10, pointsForContainingNumber: 10, pointsForContainingSymbol: 10 }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **isTaxID(locale)**                    | Check if the given value is a valid Tax Identification Number. Default locale is `en-US`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **isURL(options])**                    | check if the string is an URL.<br/><br/>`options` is an object which defaults to `{ protocols: ['http','https','ftp'], require_tld: true, require_protocol: false, require_host: true, require_valid_protocol: true, allow_underscores: false, host_whitelist: false, host_blacklist: false, allow_trailing_dot: false, allow_protocol_relative_urls: false, disallow_auth: false }`.<br/><br/>require_protocol - if set as true isURL will return false if protocol is not present in the URL.<br/>require_valid_protocol - isURL will check if the URL's protocol is present in the protocols option.<br/>protocols - valid protocols can be modified with this option.<br/>require_host - if set as false isURL will not check if host is present in the URL.<br/>require_port - if set as true isURL will check if port is present in the URL.<br/>allow_protocol_relative_urls - if set as true protocol relative URLs will be allowed.<br/>validate_length - if set as false isURL will skip string length validation (2083 characters is IE max URL length).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **isUUID(version])**                   | check if the string is a UUID (version 3, 4 or 5).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **isVariableWidth()**                  | check if the string contains a mixture of full and half-width chars.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| **isWhitelisted(chars)**               | checks characters if they appear in the whitelist.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

#### Wait

Wait is used to make the process wait for the given seconds.

```javascript
import { wait } from 'node-server-engine';

// This will make the process wait for 10 mins
await wait(600);
```

<!-- markdownlint-enable MD033 -->

## Development

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/prakashmahendran/node-server-engine.git
cd node-server-engine

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run coverage
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript and generate distribution files |
| `npm run lint` | Check code for linting errors |
| `npm run lint:fix` | Automatically fix linting errors |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting without modifying files |
| `npm test` | Run all tests with coverage |
| `npm run test:file` | Run a specific test file |
| `npm run coverage` | Generate HTML coverage report |
| `npm run coverage:ci` | Generate coverage summary for CI |

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated versioning and changelog generation.

**Format:** `type(scope): subject`

**Types:**
- `feat`: New feature (triggers minor version bump)
- `fix`: Bug fix (triggers patch version bump)
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring without feature changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

**Examples:**
```bash
git commit -m "feat(endpoints): add support for GraphQL endpoints"
git commit -m "fix(auth): resolve JWT token validation issue"
git commit -m "docs(readme): update installation instructions"
```

**Breaking Changes:** Add `BREAKING CHANGE:` in the commit body to trigger a major version bump:
```bash
git commit -m "feat(api): redesign authentication flow" -m "BREAKING CHANGE: AuthType enum values changed"
```

### Automated Versioning

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated version management and package publishing.

**How it works:**
1. Commits are analyzed based on conventional commit format
2. Version number is automatically determined (major.minor.patch)
3. Changelog is generated from commit messages
4. Git tag is created
5. Package is published to npm
6. GitHub release is created

**When releases happen:**
- Automatically on every push to `main` branch
- Only if there are release-worthy commits (feat, fix, perf, BREAKING CHANGE)
- Releases are skipped for commits with `[skip ci]` in the message

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository** and create your branch from `main`
2. **Follow the commit convention** described above
3. **Write or update tests** for your changes
4. **Ensure all tests pass** before submitting
5. **Update documentation** if needed
6. **Submit a pull request** with a clear description

### Code Style

- This project uses ESLint and Prettier for code consistency
- Run `npm run lint:fix` and `npm run format` before committing
- Husky pre-commit hooks will automatically check your code

## License

ISC © Ram

## Support

- 📫 **Issues:** [GitHub Issues](https://github.com/prakashmahendran/node-server-engine/issues)
- 📖 **Documentation:** [README](https://github.com/prakashmahendran/node-server-engine#readme)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/prakashmahendran/node-server-engine/discussions)

---

**Made with ❤️ for the Node.js community**
