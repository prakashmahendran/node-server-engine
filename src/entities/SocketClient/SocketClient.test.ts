import { randomUUID } from 'crypto';
import { generateAccessToken } from 'backend-test-tools';
import Ajv, { JSONSchemaType } from 'ajv';
import { expect } from 'chai';
import { faker } from '@faker-js/faker';
import { Sequelize } from 'sequelize';
import { fake, stub, match } from 'sinon';
import WS from 'ws';
import { SocketClient } from './SocketClient';
import { SocketMessage } from './SocketClient.types';
import { MessageHandler } from 'entities/MessageHandler';
import { Server } from 'entities/Server';
import { stubPubSub } from 'test';
import { httpsAgent, loadTlsConfig } from 'utils';

/** */
interface AuthTestMessagePayload {
  /** Is the user authenticated */
  authenticated: boolean;
  /** Id of the user when authenticated */
  userId?: string;
}
type AuthTestMessage = SocketMessage<AuthTestMessagePayload>;

const schema: JSONSchemaType<string> = { type: 'string' };
const stringPayloadValidator = new Ajv().compile(schema);

describe('Entity SocketClient', () => {
  before(() => {
    if (!httpsAgent) loadTlsConfig();
  });

  beforeEach(() => {
    stub(Sequelize.prototype, 'close');
    stubPubSub();
  });

  it('should authenticate a user with WebsSocket [auth-service]', (done) => {
    const type = faker.lorem.word();
    const payload = faker.lorem.word();
    const userId = randomUUID();
    const token = generateAccessToken(userId);

    // The handler will return a fake message
    const handler = fake((payload: unknown, client: SocketClient) => {
      client.sendMessage(type, {
        authenticated: client.isAuthenticated(),
        userId: client.getUser()?.userId
      });
    });

    const messageHandler = new MessageHandler(
      type,
      handler,
      stringPayloadValidator
    );

    const server = new Server({
      endpoints: [],
      webSocket: {
        server: { path: '/ws' },
        client: { handlers: [messageHandler] }
      }
    });

    server
      .init()
      .then(() => {
        const ws = new WS(`wss://localhost:${process.env.PORT as string}/ws`, {
          agent: httpsAgent
        });

        // When the connection is established we send a message
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'authenticate', payload: { token } }));
          ws.send(JSON.stringify({ type, payload }));
        });

        // We check that we correctly received the return message
        ws.on('message', (message: Buffer) => {
          const parsedMessage = JSON.parse(
            message.toString('utf-8')
          ) as AuthTestMessage;

          expect(parsedMessage).to.deep.equal({
            type,
            payload: { userId, authenticated: true }
          });

          server
            .shutdown()
            .then(() => {
              done();
            })
            .catch((error) => {
              done(error);
            });
        });
      })
      .catch((error) => {
        done(error);
      });
  });

  it('should send message even user is not authenticated when noAuth options set as true', (done) => {
    const type = faker.lorem.word();
    const payload = faker.lorem.word();

    // The handler will return a fake message
    const handler = fake((payload: unknown, client: SocketClient) => {
      // noAuth options set as true
      client.sendMessage(type, payload, { noAuth: true });
    });

    const messageHandler = new MessageHandler(
      type,
      handler,
      stringPayloadValidator,
      {
        authenticated: false
      }
    );

    const server = new Server({
      endpoints: [],
      webSocket: {
        server: { path: '/ws' },
        client: { handlers: [messageHandler] }
      }
    });

    server
      .init()
      .then(() => {
        const ws = new WS(`wss://localhost:${process.env.PORT as string}/ws`, {
          agent: httpsAgent
        });

        // When the connection is established we send a message
        ws.on('open', () => {
          ws.send(JSON.stringify({ type, payload }));
        });

        // We check that we correctly received the return message
        ws.on('message', (message) => {
          const parsedMessage = JSON.parse(
            message.toString('utf-8')
          ) as AuthTestMessage;
          expect(parsedMessage).to.deep.equal({
            type,
            payload
          });
          server
            .shutdown()
            .then(() => {
              done();
            })
            .catch((error) => {
              done(error);
            });
        });
      })
      .catch((error) => {
        done(error);
      });
  });

  it('should send message on user authenticated with given audience', (done) => {
    const type = faker.lorem.word();
    const payload = faker.lorem.word();
    const userId = randomUUID();
    const token = generateAccessToken(userId);

    // The handler will return a fake message
    const handler = fake((payload: unknown, client: SocketClient) => {
      client.sendMessage(
        type,
        {
          authenticated: client.isAuthenticated(),
          userId: client.getUser()?.userId
        },
        { audience: process.env.ACCESS_TOKEN_AUDIENCE as string }
      );
    });
    const messageHandler = new MessageHandler(
      type,
      handler,
      stringPayloadValidator
    );

    const server = new Server({
      endpoints: [],
      webSocket: {
        server: { path: '/ws' },
        client: { handlers: [messageHandler] }
      }
    });

    server
      .init()
      .then(() => {
        const ws = new WS(`wss://localhost:${process.env.PORT as string}/ws`, {
          agent: httpsAgent
        });

        // When the connection is established we send a message
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'authenticate', payload: { token } }));
          ws.send(JSON.stringify({ type, payload }));
        });

        // We check that we correctly received the return message
        ws.on('message', (message) => {
          const parsedMessage = JSON.parse(
            message.toString('utf-8')
          ) as AuthTestMessage;

          expect(parsedMessage).to.deep.equal({
            type,
            payload: { userId, authenticated: true }
          });

          server
            .shutdown()
            .then(() => {
              done();
            })
            .catch((error) => {
              done(error);
            });
        });
      })
      .catch((error) => {
        done(error);
      });
  });

  it('should handle the auth callback', (done) => {
    const type = faker.lorem.word();
    const payload = faker.lorem.word();
    const userId = randomUUID();
    const token = generateAccessToken(userId);
    const authCallback = fake();

    // The handler will return a fake message
    const handler = fake((payload: unknown, client: SocketClient) => {
      client.sendMessage(type, {
        authenticated: client.isAuthenticated(),
        userId: client.getUser()?.userId
      });
    });
    const messageHandler = new MessageHandler(
      type,
      handler,
      stringPayloadValidator
    );

    const server = new Server({
      endpoints: [],
      webSocket: {
        server: { path: '/ws' },
        client: { handlers: [messageHandler], authCallbacks: authCallback }
      }
    });

    server
      .init()
      .then(() => {
        const ws = new WS(`wss://localhost:${process.env.PORT as string}/ws`, {
          agent: httpsAgent
        });

        // When the connection is established we send a message
        ws.on('open', () => {
          ws.send(JSON.stringify({ type: 'authenticate', payload: { token } }));
          ws.send(JSON.stringify({ type, payload }));
        });

        ws.on('message', () => {
          expect(authCallback).to.have.been.calledOnceWithExactly(
            match.instanceOf(SocketClient)
          );

          server
            .shutdown()
            .then(() => {
              done();
            })
            .catch((error) => {
              done(error);
            });
        });
      })
      .catch((error) => {
        done(error);
      });
  });

  it('should call init an shutdown callbacks', (done) => {
    const initCallbacks = fake();
    const shutdownCallbacks = fake();

    const server = new Server({
      endpoints: [],
      webSocket: {
        server: { path: '/ws' },
        client: { handlers: [], initCallbacks, shutdownCallbacks }
      }
    });

    server
      .init()
      .then(() => {
        const ws = new WS(`wss://localhost:${process.env.PORT as string}/ws`, {
          agent: httpsAgent
        });

        ws.on('open', () => {
          expect(initCallbacks).to.have.been.calledOnceWithExactly(
            match.instanceOf(SocketClient)
          );
          expect(shutdownCallbacks).to.not.have.been.called;
          ws.close();
        });

        ws.on('close', () => {
          // We give 5ms for the delete to ba handled on the socket server side
          setTimeout(() => {
            expect(initCallbacks).to.have.been.calledOnceWithExactly(
              match.instanceOf(SocketClient)
            );
            expect(shutdownCallbacks).to.have.been.calledOnceWithExactly(
              match.instanceOf(SocketClient)
            );
            server
              .shutdown()
              .then(() => {
                done();
              })
              .catch((error) => {
                done(error);
              });
          }, 5);
        });
      })
      .catch((error) => {
        done(error);
      });
  });

  it('should keep track of connected clients', (done) => {
    const server = new Server({
      endpoints: [],
      webSocket: { server: { path: '/ws' }, client: { handlers: [] } }
    });

    server
      .init()
      .then(() => {
        const ws = new WS(`wss://localhost:${process.env.PORT as string}/ws`, {
          agent: httpsAgent
        });

        ws.on('open', () => {
          expect(Object.keys(SocketClient.getSocketClients())).to.have.length(
            1
          );
          ws.close();
        });

        ws.on('close', () => {
          // We give 5ms for the delete to ba handled on the socket server side
          setTimeout(() => {
            expect(Object.keys(SocketClient.getSocketClients())).to.have.length(
              0
            );
            server
              .shutdown()
              .then(() => {
                done();
              })
              .catch((error) => {
                done(error);
              });
          }, 5);
        });
      })
      .catch((error) => {
        done(error);
      });
  });
});
