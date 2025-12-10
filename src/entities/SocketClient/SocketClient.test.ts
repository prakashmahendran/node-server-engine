import { expect } from 'chai';
import sinon from 'sinon';
import { IncomingMessage } from 'http';
import WebSocket from 'ws';
import { SocketClient } from './index';
import { MessageHandler } from 'entities/MessageHandler';
import Ajv from 'ajv';

describe('Entity - SocketClient', () => {
  let mockWebSocket: any;
  let mockRequest: IncomingMessage;
  let mockHandler: MessageHandler;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.NODE_ENV = 'test';

    mockWebSocket = {
      on: sinon.stub().returnsThis(),
      send: sinon.stub(),
      close: sinon.stub(),
      ping: sinon.stub(),
      terminate: sinon.stub(),
      readyState: WebSocket.OPEN,
      OPEN: WebSocket.OPEN,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED
    };

    mockRequest = {} as IncomingMessage;

    // Create a real MessageHandler instance
    const ajv = new Ajv();
    const schema = { type: 'object', properties: {} };
    const validator = ajv.compile(schema);
    mockHandler = new MessageHandler(
      'test-type',
      async () => {},
      validator,
      { authenticated: false }
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
  });

  describe('constructor', () => {
    it('should create a SocketClient instance', () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      expect(client).to.be.instanceOf(SocketClient);
      expect(client.id).to.be.a('string');
      expect(client.establishedAt).to.be.instanceOf(Date);
    });

    it('should accept single callback functions', () => {
      const initCallback = sinon.stub();
      const authCallback = sinon.stub();
      const shutdownCallback = sinon.stub();

      expect(() => {
        new SocketClient(mockWebSocket, mockRequest, {
          handlers: [mockHandler],
          initCallbacks: initCallback,
          authCallbacks: authCallback,
          shutdownCallbacks: shutdownCallback
        });
      }).to.not.throw();
    });

    it('should accept arrays of callback functions', () => {
      const initCallbacks = [sinon.stub(), sinon.stub()];
      const authCallbacks = [sinon.stub(), sinon.stub()];
      const shutdownCallbacks = [sinon.stub(), sinon.stub()];

      expect(() => {
        new SocketClient(mockWebSocket, mockRequest, {
          handlers: [mockHandler],
          initCallbacks,
          authCallbacks,
          shutdownCallbacks
        });
      }).to.not.throw();
    });

    it('should generate unique IDs for different instances', () => {
      const client1 = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const mockWebSocket2 = { ...mockWebSocket, on: sinon.stub().returnsThis() };
      const client2 = new SocketClient(mockWebSocket2, mockRequest, {
        handlers: [mockHandler]
      });

      expect(client1.id).to.not.equal(client2.id);
    });
  });

  describe('message handling', () => {
    it('should handle incoming messages', () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const messageHandler = mockWebSocket.on
        .getCalls()
        .find((call: any) => call.args[0] === 'message')?.args[1];

      expect(messageHandler).to.be.a('function');
    });
  });

  describe('authentication', () => {
    it('should start with unauthenticated state', () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      expect(client.isAuthenticated()).to.be.false;
    });

    it('should return undefined user when not authenticated', () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      expect(client.getUser()).to.be.undefined;
    });
  });

  describe('sendMessage', () => {
    it('should have sendMessage method', () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      expect(client.sendMessage).to.be.a('function');
    });
  });

  describe('WebSocket integration', () => {
    it('should setup WebSocket event listeners', () => {
      new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      expect(mockWebSocket.on.called).to.be.true;
      const events = mockWebSocket.on.getCalls().map((call: any) => call.args[0]);
      expect(events).to.include('message');
      expect(events).to.include('close');
      expect(events).to.include('pong');
    });

    it('should handle WebSocket close events', () => {
      new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const closeHandler = mockWebSocket.on
        .getCalls()
        .find((call: any) => call.args[0] === 'close')?.args[1];

      expect(closeHandler).to.be.a('function');
    });
  });

  describe('close and error handling', () => {
    it('should remove client and clear timers on close', async () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const closeHandler = mockWebSocket.on
        .getCalls()
        .find((call: any) => call.args[0] === 'close')?.args[1];

      // Set fake timers to verify they are cleared
      // @ts-ignore
      (client as any).authRenewTimer = setTimeout(() => {}, 10000);
      // @ts-ignore
      (client as any).authExpireTimer = setTimeout(() => {}, 10000);
      // @ts-ignore
      (client as any).pingInterval = setInterval(() => {}, 10000);

      await closeHandler();

      // After close, the client should not be retrievable
      const retrieved = SocketClient.getSocketClient(client.id);
      expect(retrieved).to.be.undefined;
    });

    it('should log error on websocket error', () => {
      new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const errHandler = mockWebSocket.on
        .getCalls()
        .find((call: any) => call.args[0] === 'error')?.args[1];

      expect(errHandler).to.be.a('function');
      // Call without throwing
      errHandler(new Error('ws error'));
    });
  });

  describe('static methods', () => {
    it('should provide getSocketClients method', () => {
      expect(SocketClient.getSocketClients).to.be.a('function');
    });

    it('should provide getSocketClient method', () => {
      expect(SocketClient.getSocketClient).to.be.a('function');
    });

    it('should track connected clients', () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const clients = SocketClient.getSocketClients();
      expect(clients[client.id]).to.equal(client);
    });

    it('should retrieve specific client by ID', () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const retrieved = SocketClient.getSocketClient(client.id);
      expect(retrieved).to.equal(client);
    });

    it('should return undefined for non-existent client ID', () => {
      const client = SocketClient.getSocketClient('non-existent-id');
      expect(client).to.be.undefined;
    });
  });

  describe('WebSocket integration', () => {
    it('should setup WebSocket event listeners', () => {
      new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      expect(mockWebSocket.on.called).to.be.true;
      const events = mockWebSocket.on.getCalls().map((call: any) => call.args[0]);
      expect(events).to.include('message');
      expect(events).to.include('close');
      expect(events).to.include('pong');
    });

    it('should handle WebSocket close events', () => {
      new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const closeHandler = mockWebSocket.on
        .getCalls()
        .find((call: any) => call.args[0] === 'close')?.args[1];

      expect(closeHandler).to.be.a('function');
    });
  });

  describe('authentication', () => {
    it('should authenticate with valid token', async () => {
      const { generateAccessToken } = await import('backend-test-tools');
      const token = generateAccessToken('test-user-id');
      
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const messageHandler = mockWebSocket.on
        .getCalls()
        .find((call: any) => call.args[0] === 'message')?.args[1];

      const authMessage = JSON.stringify({
        type: 'authenticate',
        payload: { token }
      });

      await messageHandler(Buffer.from(authMessage));
      
      // Wait a tick for authentication to complete
      await new Promise(resolve => setImmediate(resolve));
      
      expect(client.isAuthenticated()).to.be.true;
      expect(client.getUser()).to.have.property('userId', 'test-user-id');
    });

    it('should handle ping messages', async () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const messageHandler = mockWebSocket.on
        .getCalls()
        .find((call: any) => call.args[0] === 'message')?.args[1];

      const pingMessage = JSON.stringify({ type: 'ping' });
      await messageHandler(Buffer.from(pingMessage));

      expect(mockWebSocket.send.called).to.be.true;
      const sentData = JSON.parse(mockWebSocket.send.firstCall.args[0]);
      expect(sentData.type).to.equal('pong');
    });

    it('should route messages to handlers', async () => {
      const handleStub = sinon.stub().resolves();
      mockHandler.handle = handleStub;

      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      const messageHandler = mockWebSocket.on
        .getCalls()
        .find((call: any) => call.args[0] === 'message')?.args[1];

      const customMessage = JSON.stringify({
        type: 'custom-type',
        payload: { data: 'test' }
      });
      await messageHandler(Buffer.from(customMessage));

      expect(handleStub.called).to.be.true;
    });
  });

  describe('message sending', () => {
    it('should send message without auth when noAuth is true', () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      client.sendMessage('test-type', { data: 'test' }, { noAuth: true });

      expect(mockWebSocket.send.called).to.be.true;
      const sent = JSON.parse(mockWebSocket.send.firstCall.args[0]);
      expect(sent.type).to.equal('test-type');
      expect(sent.payload).to.deep.equal({ data: 'test' });
    });

    it('should not send message to unauthenticated client without noAuth', () => {
      const client = new SocketClient(mockWebSocket, mockRequest, {
        handlers: [mockHandler]
      });

      client.sendMessage('test-type', { data: 'test' });

      expect(mockWebSocket.send.called).to.be.false;
    });
  });
});

