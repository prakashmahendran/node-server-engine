import { expect } from 'chai';
import { stub } from 'sinon';
import nodemailer from 'nodemailer';
import { sendEmail } from './sendEmail';
import { resetGraphToken } from './graphMail';

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

  it('should default the sender to MAIL_FROM', async () => {
    process.env.MAIL_FROM = 'App <no-reply@example.com>';
    const sendMail = stub().resolves({ response: 'ok', messageId: 'm4' });
    const createTransportStub = stub(nodemailer, 'createTransport').returns({
      sendMail
    } as any);
    try {
      await sendEmail({ to: 'b@example.com', subject: 's' });
      expect(sendMail.firstCall.args[0].from).to.equal(
        'App <no-reply@example.com>'
      );
    } finally {
      createTransportStub.restore();
    }
  });

  describe('Microsoft Graph', () => {
    beforeEach(() => {
      Object.assign(process.env, {
        GRAPH_TENANT_ID: 'tenant',
        GRAPH_CLIENT_ID: 'client',
        GRAPH_CLIENT_SECRET: 'secret',
        GRAPH_SENDER: 'sender@example.com'
      });
      resetGraphToken();
    });

    const response = (status: number, body: unknown): Response =>
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' }
      });

    it('should sign in once and send as GRAPH_SENDER instead of using SMTP', async () => {
      const createTransportStub = stub(nodemailer, 'createTransport');
      const fetchStub = stub(globalThis, 'fetch').callsFake(async (url) =>
        String(url).includes('login.microsoftonline.com')
          ? response(200, { access_token: 't1', expires_in: 3600 })
          : new Response(null, { status: 202 })
      );
      try {
        const mail = {
          to: ['a@example.com'],
          cc: 'c@example.com',
          subject: 'Hi',
          html: '<p>Hi</p>',
          attachments: [
            { filename: 'a.txt', content: 'abc', contentType: 'text/plain' }
          ]
        };
        expect((await sendEmail(mail)).status).to.equal('sent');
        expect((await sendEmail(mail)).status).to.equal('sent');
        const tokenCalls = fetchStub
          .getCalls()
          .filter((c) => String(c.args[0]).includes('login.'));
        expect(tokenCalls).to.have.length(1);
        const send = fetchStub
          .getCalls()
          .find((c) =>
            String(c.args[0]).includes('/users/sender%40example.com/sendMail')
          );
        const body = JSON.parse(String((send?.args[1] as RequestInit).body));
        expect(body.saveToSentItems).to.equal(false);
        expect(body.message.toRecipients).to.deep.equal([
          { emailAddress: { address: 'a@example.com' } }
        ]);
        expect(body.message.ccRecipients).to.deep.equal([
          { emailAddress: { address: 'c@example.com' } }
        ]);
        expect(body.message.body).to.deep.equal({
          contentType: 'HTML',
          content: '<p>Hi</p>'
        });
        expect(body.message.attachments[0].contentBytes).to.equal(
          Buffer.from('abc').toString('base64')
        );
        expect(createTransportStub).to.not.have.been.called;
      } finally {
        fetchStub.restore();
        createTransportStub.restore();
      }
    });

    it('should report a refused message as failed with the reason', async () => {
      const fetchStub = stub(globalThis, 'fetch').callsFake(async (url) =>
        String(url).includes('login.microsoftonline.com')
          ? response(200, { access_token: 't1', expires_in: 3600 })
          : response(403, { error: { message: 'Access denied' } })
      );
      try {
        const res = await sendEmail({
          to: 'a@example.com',
          subject: 's',
          text: 't'
        });
        expect(res.status).to.equal('failed');
        expect(res.error).to.include('Access denied');
      } finally {
        fetchStub.restore();
      }
    });
  });
});
