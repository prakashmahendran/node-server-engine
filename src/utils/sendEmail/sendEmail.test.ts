import { expect } from 'chai';
import { stub } from 'sinon';
import nodemailer from 'nodemailer';
import { sendEmail } from './sendEmail';

describe('Utils - sendEmail', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@example.com';
    process.env.SMTP_PASS = 'password';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return queued when provider response contains queued', async () => {
    const createTransportStub = stub(nodemailer, 'createTransport').returns({
      sendMail: stub().resolves({ response: 'message queued', messageId: 'm1' })
    } as any);
    try {
      const res = await sendEmail({ from: 'a', to: 'b', subject: 's' });
      expect(res.status).to.equal('queued');
      expect(res.messageId).to.equal('m1');
    } finally {
      createTransportStub.restore();
    }
  });

  it('should return delivered when provider response contains delivered', async () => {
    const createTransportStub = stub(nodemailer, 'createTransport').returns({
      sendMail: stub().resolves({ response: 'ok delivered', messageId: 'm2' })
    } as any);
    try {
      const res = await sendEmail({ from: 'a', to: 'b', subject: 's' });
      expect(res.status).to.equal('delivered');
      expect(res.messageId).to.equal('m2');
    } finally {
      createTransportStub.restore();
    }
  });

  it('should return sent by default for other responses', async () => {
    const createTransportStub = stub(nodemailer, 'createTransport').returns({
      sendMail: stub().resolves({ response: 'OK', messageId: 'm3' })
    } as any);
    try {
      const res = await sendEmail({ from: 'a', to: 'b', subject: 's' });
      expect(res.status).to.equal('sent');
      expect(res.messageId).to.equal('m3');
    } finally {
      createTransportStub.restore();
    }
  });

  it('should return failed on error', async () => {
    const createTransportStub = stub(nodemailer, 'createTransport').returns({
      sendMail: stub().rejects(new Error('smtp error'))
    } as any);
    try {
      const res = await sendEmail({ from: 'a', to: 'b', subject: 's' });
      expect(res.status).to.equal('failed');
      expect(res.error).to.include('smtp error');
    } finally {
      createTransportStub.restore();
    }
  });
});
