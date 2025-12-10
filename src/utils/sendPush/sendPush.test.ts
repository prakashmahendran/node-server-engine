import { expect } from 'chai';
import sinon from 'sinon';
import axios from 'axios';
import { sendPush } from './sendPush';

describe('Utils - sendPush', () => {
  let axiosRequestStub: sinon.SinonStub;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.PUSH_SERVICE_URL = 'https://push.example.com';
    // Stub TLS-related env vars to avoid loadTlsConfig issues
    process.env.TLS_REQUEST_KEY = 'dummy';
    process.env.TLS_REQUEST_CERT = 'dummy';
    process.env.TLS_REQUEST_CA = 'dummy';
    axiosRequestStub = sinon.stub(axios, 'request');
  });

  afterEach(() => {
    process.env = originalEnv;
    sinon.restore();
  });

  it('should send push notification with userId and notification', async () => {
    axiosRequestStub.resolves({ data: { success: true } });
    
    const userId = 'user-123';
    const notification = { title: 'Test', body: 'Test message' };
    
    await sendPush(userId, notification);
    
    expect(axiosRequestStub).to.have.been.calledOnce;
    const callArgs = axiosRequestStub.firstCall.args[0];
    expect(callArgs.method).to.equal('post');
    expect(callArgs.url).to.equal('/push');
    expect(callArgs.baseURL).to.equal('https://push.example.com');
    expect(callArgs.data).to.deep.equal({ userId, title: 'Test', body: 'Test message' });
  });

  it('should include all notification properties', async () => {
    axiosRequestStub.resolves({ data: { success: true } });
    
    const userId = 'user-456';
    const notification = { 
      title: 'Alert', 
      body: 'Important message',
      badge: 1,
      sound: 'default'
    };
    
    await sendPush(userId, notification);
    
    const callArgs = axiosRequestStub.firstCall.args[0];
    expect(callArgs.data).to.deep.equal({
      userId: 'user-456',
      title: 'Alert',
      body: 'Important message',
      badge: 1,
      sound: 'default'
    });
  });

  it('should use PUSH_SERVICE_URL from environment', async () => {
    process.env.PUSH_SERVICE_URL = 'https://custom-push.com';
    axiosRequestStub.resolves({ data: { success: true } });
    
    await sendPush('user-123', { title: 'Test', body: 'Message' });
    
    const callArgs = axiosRequestStub.firstCall.args[0];
    expect(callArgs.baseURL).to.equal('https://custom-push.com');
  });

  it('should return response from request', async () => {
    const mockResponse = { data: { messageId: 'msg-123', status: 'sent' } };
    axiosRequestStub.resolves(mockResponse);
    
    const result = await sendPush('user-123', { title: 'Test', body: 'Message' });
    
    expect(result).to.deep.equal(mockResponse);
  });

  it('should throw error if request fails', async () => {
    axiosRequestStub.rejects(new Error('Network error'));
    
    try {
      await sendPush('user-123', { title: 'Test', body: 'Message' });
      expect.fail('Should have thrown error');
    } catch (error) {
      expect((error as Error).message).to.include('Network error');
    }
  });

  it('should use POST method', async () => {
    axiosRequestStub.resolves({ data: { success: true } });
    
    await sendPush('user-123', { title: 'Test', body: 'Message' });
    
    const callArgs = axiosRequestStub.firstCall.args[0];
    expect(callArgs.method).to.equal('post');
  });

  it('should use /push endpoint', async () => {
    axiosRequestStub.resolves({ data: { success: true } });
    
    await sendPush('user-123', { title: 'Test', body: 'Message' });
    
    const callArgs = axiosRequestStub.firstCall.args[0];
    expect(callArgs.url).to.equal('/push');
  });

  it('should handle empty notification body', async () => {
    axiosRequestStub.resolves({ data: { success: true } });
    
    await sendPush('user-123', { title: 'Test', body: '' });
    
    const callArgs = axiosRequestStub.firstCall.args[0];
    expect(callArgs.data.body).to.equal('');
  });

  it('should handle special characters in notification', async () => {
    axiosRequestStub.resolves({ data: { success: true } });
    
    const notification = { 
      title: 'Test with émojis 🎉', 
      body: 'Special chars: <>"\'' 
    };
    
    await sendPush('user-123', notification);
    
    const callArgs = axiosRequestStub.firstCall.args[0];
    expect(callArgs.data.title).to.equal('Test with émojis 🎉');
    expect(callArgs.data.body).to.equal('Special chars: <>"\'');
  });
});
