import { EmailOptions, EmailResult, EmailStatus } from './sendEmail.types';
import { graphConfigured, sendViaGraph } from './graphMail';
import nodemailer, {
  Transporter,
  SendMailOptions,
  SentMessageInfo
} from 'nodemailer';

/**
 * Sends an email: through Microsoft Graph when GRAPH_* is configured, otherwise through SMTP (Nodemailer).
 * The sender defaults to MAIL_FROM.
 * @param emailOptions - Configuration options for sending the email.
 * @returns A Promise that resolves with an EmailResult indicating success or failure.
 */
export const sendEmail = async (
  emailOptions: EmailOptions
): Promise<EmailResult> => {
  if (graphConfigured()) {
    try {
      await sendViaGraph(emailOptions);
      return { status: 'sent' };
    } catch (error) {
      return { status: 'failed', error: (error as Error).message };
    }
  }
  try {
    // Create a transport with SMTP configuration
    const transporter: Transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465' ? true : false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        // Certificates are verified by default to protect the SMTP credentials and content
        // Set SMTP_TLS_REJECT_UNAUTHORIZED=false only for servers with self-signed certificates
        rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false'
      },
      requireTLS: true
    });

    // Construct email options
    const mailOptions: SendMailOptions = {
      from: emailOptions.from ?? process.env.MAIL_FROM,
      to: emailOptions.to,
      cc: emailOptions.cc,
      bcc: emailOptions.bcc,
      subject: emailOptions.subject,
      text: emailOptions.text,
      html: emailOptions.html,
      attachments: emailOptions.attachments,
      replyTo: emailOptions.replyTo,
      headers: emailOptions.headers,
      priority: emailOptions.priority
    };

    // Send email
    const info: SentMessageInfo = await transporter.sendMail(mailOptions);

    // Determine email status
    let status: EmailStatus = 'sent';
    if (info.response?.includes('queued')) {
      status = 'queued';
    } else if (info.response?.includes('delivered')) {
      status = 'delivered';
    }

    return { status, messageId: info.messageId };
  } catch (error) {
    return { status: 'failed', error: (error as Error).message };
  }
};
