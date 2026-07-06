/**
 * WhatsApp Business Cloud API Service
 * Supports sandbox (logging only) and production (Meta API) modes.
 */

interface SendMessageOptions {
  phone: string;
  text: string;
  businessWaPhoneId?: string;
  businessAccessToken?: string;
  mode?: "sandbox" | "production";
}

interface TemplateMessageOptions extends SendMessageOptions {
  templateName: string;
  params: string[];
  language?: string;
}

export interface WAMessage {
  id: string;
  direction: "outgoing";
  from: string;
  to: string;
  text: string;
  timestamp: string;
  status: "sent" | "delivered" | "read" | "failed";
}

export async function sendWhatsAppText(opts: SendMessageOptions): Promise<WAMessage> {
  const msgId = `wa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  if (opts.mode === "production" && opts.businessWaPhoneId && opts.businessAccessToken) {
    // Real Meta WhatsApp Cloud API call
    const url = `https://graph.facebook.com/v19.0/${opts.businessWaPhoneId}/messages`;
    const body = {
      messaging_product: "whatsapp",
      to: opts.phone.replace(/\s+/g, ""),
      type: "text",
      text: { body: opts.text, preview_url: false },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.businessAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${data?.error?.message || response.statusText}`);
    }

    return {
      id: data?.messages?.[0]?.id || msgId,
      direction: "outgoing",
      from: "business",
      to: opts.phone,
      text: opts.text,
      timestamp: new Date().toISOString(),
      status: "sent",
    };
  }

  // Sandbox — log only
  console.log(`[WA Sandbox] → ${opts.phone}: ${opts.text.slice(0, 80)}...`);
  return {
    id: msgId,
    direction: "outgoing",
    from: "business",
    to: opts.phone,
    text: opts.text,
    timestamp: new Date().toISOString(),
    status: "sent",
  };
}

export async function sendWhatsAppTemplate(opts: TemplateMessageOptions): Promise<WAMessage> {
  if (opts.mode === "production" && opts.businessWaPhoneId && opts.businessAccessToken) {
    const url = `https://graph.facebook.com/v19.0/${opts.businessWaPhoneId}/messages`;
    const body = {
      messaging_product: "whatsapp",
      to: opts.phone.replace(/\s+/g, ""),
      type: "template",
      template: {
        name: opts.templateName,
        language: { code: opts.language || "en" },
        components: [
          {
            type: "body",
            parameters: opts.params.map((p) => ({ type: "text", text: p })),
          },
        ],
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.businessAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json() as any;
    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${data?.error?.message || response.statusText}`);
    }

    return {
      id: data?.messages?.[0]?.id || `wa-${Date.now()}`,
      direction: "outgoing",
      from: "business",
      to: opts.phone,
      text: `[Template: ${opts.templateName}]`,
      timestamp: new Date().toISOString(),
      status: "sent",
    };
  }

  // Sandbox
  console.log(`[WA Sandbox Template] → ${opts.phone}: [${opts.templateName}]`);
  return {
    id: `wa-sandbox-${Date.now()}`,
    direction: "outgoing",
    from: "business",
    to: opts.phone,
    text: `[Sandbox Template: ${opts.templateName}] Params: ${opts.params.join(", ")}`,
    timestamp: new Date().toISOString(),
    status: "sent",
  };
}

/** Fill template placeholders with actual values */
export function interpolateTemplate(bodyText: string, vars: Record<string, string>): string {
  return bodyText.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
