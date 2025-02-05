/** Structure representing email options for sending an email */
export interface EmailOptions {
  /** Sender's email address (optional, defaults to the authenticated user) */
  from?: string;

  /** Recipient(s) of the email - can be a string or an array of strings */
  to: string | string[];

  /** Carbon Copy (CC) recipients (optional) */
  cc?: string | string[];

  /** Blind Carbon Copy (BCC) recipients (optional) */
  bcc?: string | string[];

  /** Subject of the email */
  subject: string;

  /** Plain text version of the email body (optional) */
  text?: string;

  /** HTML version of the email body (optional) */
  html?: string;

  /** Attachments to include in the email (optional) */
  attachments?: {
    /** Name of the attached file */
    filename: string;
    /** Content of the attachment (Buffer or string) */
    content?: string | Buffer;
    /** File path of the attachment (alternative to `content`) */
    path?: string;
    /** MIME type of the attachment */
    contentType?: string;
    /** Encoding of the attachment (e.g., base64, utf-8) */
    encoding?: string;
    /** Content ID for inline images (optional) */
    cid?: string;
  }[];

  /** Email address for replies (optional) */
  replyTo?: string;

  /** Custom headers for the email (optional) */
  headers?: { [key: string]: string };

  /** Email priority level (optional) */
  priority?: 'high' | 'normal' | 'low';
}

/** Possible statuses for email delivery */
export type EmailStatus = 'sent' | 'delivered' | 'queued' | 'failed';

/** Structure representing the result of an email sending operation */
export interface EmailResult {
  /** Status of the email operation */
  status: EmailStatus;
  /** Message ID returned by the mail server (if available) */
  messageId?: string;
  /** Error message in case of failure (if any) */
  error?: string;
}
