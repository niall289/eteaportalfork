import fetch from 'node-fetch';

export async function sendEmail({
  to, subject, text, html, templateId, variables, from, fromName, replyTo, headers, cc, bcc,
}: {
  to: string | string[];
  subject?: string;
  text?: string;
  html?: string;
  templateId?: string;
  variables?: Record<string, any>;
  from?: string;
  fromName?: string;
  replyTo?: string;
  headers?: Record<string,string>;
  cc?: string[]; bcc?: string[];
}): Promise<{ ok: boolean; id?: string; status?: number; error?: string }> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: 'MAILERSEND_API_KEY not set' };
  }

  const maskedKey = apiKey.slice(0, 4) + '...' + apiKey.slice(-4);
  console.log(`Sending email with API key: ${maskedKey}`);

  const fromObj = {
    email: from || process.env.MAILERSEND_FROM || 'noreply@eteahealth.ie',
    name: fromName || process.env.MAILERSEND_FROM_NAME || 'ETEA Clinics'
  };

  const replyToEmail = replyTo || process.env.MAILERSEND_REPLY_TO || 'hello@eteahealth.ie';

  const toArray = Array.isArray(to) ? to.map(email => ({ email })) : [{ email: to }];

  const basePayload: any = {
    from: fromObj,
    to: toArray,
    reply_to: { email: replyToEmail },
    ...(cc && { cc: cc.map(email => ({ email })) }),
    ...(bcc && { bcc: bcc.map(email => ({ email })) }),
    ...(headers && { headers }),
  };

  let payload: any;
  if (templateId) {
    payload = {
      ...basePayload,
      template_id: templateId,
      ...(variables && { variables }),
    };
  } else {
    payload = {
      ...basePayload,
      ...(subject && { subject }),
      ...(text && { text }),
      ...(html && { html }),
    };
  }

  try {
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const status = response.status;

    if (response.ok) {
      const data = await response.json() as { message_id?: string };
      return { ok: true, id: data.message_id, status };
    } else {
      const errorText = await response.text();
      return { ok: false, status, error: errorText };
    }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}