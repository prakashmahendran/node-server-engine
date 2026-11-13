import { readFileSync } from 'fs';
import { EmailOptions } from './sendEmail.types';

/**
 * Microsoft Graph delivery (Microsoft 365 mailboxes), used by sendEmail when GRAPH_TENANT_ID,
 * GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET and GRAPH_SENDER are set. The app registration needs the Mail.Send
 * application permission; mail is sent as GRAPH_SENDER and not kept in its Sent Items.
 */
export const graphConfigured = (): boolean =>
  Boolean(
    process.env.GRAPH_TENANT_ID &&
    process.env.GRAPH_CLIENT_ID &&
    process.env.GRAPH_CLIENT_SECRET &&
    process.env.GRAPH_SENDER
  );

// App-only token (client credentials), reused until a minute before it expires
let token: { value: string; expiresAt: number } | null = null;

/** Forget the cached token (tests, rotated secrets) */
export function resetGraphToken(): void {
  token = null;
}

async function graphToken(): Promise<string> {
  if (token && token.expiresAt > Date.now() + 60_000) return token.value;
  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(process.env.GRAPH_TENANT_ID ?? '')}/oauth2/v2.0/token`,
    {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.GRAPH_CLIENT_ID ?? '',
        client_secret: process.env.GRAPH_CLIENT_SECRET ?? '',
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    }
  );
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !body.access_token)
    throw new Error(
      `Graph sign-in failed: ${body.error_description || body.error || res.status}`
    );
  token = {
    value: body.access_token,
    expiresAt: Date.now() + Number(body.expires_in ?? 0) * 1000
  };
  return token.value;
}

const recipients = (
  list?: string | Array<string>
): Array<{ emailAddress: { address: string } }> =>
  ([] as Array<string>)
    .concat(list ?? [])
    .map((address) => ({ emailAddress: { address } }));

/** Send one message through Graph. Throws with the provider's reason when it is refused. */
export async function sendViaGraph(email: EmailOptions): Promise<void> {
  const message = {
    subject: email.subject,
    body: email.html
      ? { contentType: 'HTML', content: email.html }
      : { contentType: 'Text', content: email.text ?? '' },
    toRecipients: recipients(email.to),
    ccRecipients: recipients(email.cc),
    bccRecipients: recipients(email.bcc),
    ...(email.replyTo ? { replyTo: recipients(email.replyTo) } : {}),
    attachments: (email.attachments ?? []).map((a) => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: a.filename,
      contentType: a.contentType ?? 'application/octet-stream',
      contentBytes: Buffer.from(
        a.content ?? (a.path ? readFileSync(a.path) : '')
      ).toString('base64')
    }))
  };
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(process.env.GRAPH_SENDER ?? '')}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await graphToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, saveToSentItems: false })
    }
  );
  if (res.status === 401) token = null;
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(
      `Graph sendMail failed: ${body.error?.message || res.status}`
    );
  }
}
