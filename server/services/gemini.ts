import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (API_KEY && API_KEY !== "YOUR_GEMINI_API_KEY") {
  ai = new GoogleGenAI({
    apiKey: API_KEY,
    httpOptions: { headers: { "User-Agent": "whatapply-server" } },
  });
  console.log("✅ Gemini AI client initialized.");
} else {
  console.log("⚠️  No GEMINI_API_KEY — running in simulated AI mode.");
}

export const geminiLive = !!ai;

// ── Template Copilot ──────────────────────────────────────────
export async function generateTemplateAI(
  prompt: string,
  businessType: string,
  category: string
): Promise<{ templateName: string; bodyText: string; category: string; explanation: string }> {
  const systemPrompt = `You are an expert WhatsApp copywriter for small Indian businesses.
Write high-converting, friendly, concise WhatsApp message templates.
Use Indian context (Namaste, Ji, ₹ symbol), *bold* for key info, and {{placeholder}} variables.
Business type: "${businessType}". Message category: "${category}".
User goal: "${prompt}"

Respond ONLY with valid JSON:
{
  "templateName": "snake_case_slug",
  "bodyText": "The full message with {{placeholders}}",
  "category": "UTILITY" or "MARKETING",
  "explanation": "1-2 sentences explaining why this works"
}`;

  if (ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: systemPrompt,
      config: { responseMimeType: "application/json" },
    });
    return JSON.parse(response.text || "{}");
  }

  // Simulated fallback
  const isPromo =
    category === "MARKETING" ||
    prompt.toLowerCase().includes("promo") ||
    prompt.toLowerCase().includes("discount") ||
    prompt.toLowerCase().includes("offer");

  if (isPromo) {
    return {
      templateName: "festive_offer",
      bodyText:
        "Hello {{customer_name}}! 🎉 Special offer from *{{business_name}}*! Get *{{discount}}% OFF* on {{service_name}} this week only. Reply *'BOOK'* to grab your slot! 🛍️✨",
      category: "MARKETING",
      explanation:
        "Highlights discount in bold for instant attention and includes a clear call-to-action to drive bookings.",
    };
  }
  return {
    templateName: "polite_reminder",
    bodyText:
      "Namaste {{customer_name}} Ji 🙏 This is a gentle reminder from *{{business_name}}* regarding your outstanding balance of *₹{{amount}}*. Pay via UPI: {{upi_link}}. Thank you for your continued trust!",
    category: "UTILITY",
    explanation:
      "Respectful Indian greeting, bold amount for clarity, and direct UPI payment link for ease.",
  };
}

// ── Smart Chat Reply (Concierge) ──────────────────────────────
interface ChatReplyContext {
  businessName: string;
  businessType: string;
  services: Array<{ name: string; price: number; duration_min: number }>;
  customerName?: string;
  customerBalance?: number;
}

export async function generateChatReply(
  customerMessage: string,
  ctx: ChatReplyContext
): Promise<string> {
  const servicesText = ctx.services
    .map((s) => `• ${s.name} — ₹${s.price} (${s.duration_min} min)`)
    .join("\n");

  const prompt = `You are a friendly WhatsApp assistant named "Riya" for "${ctx.businessName}", a ${ctx.businessType} business in India.
Keep responses under 3 sentences. Use emojis sparingly. Reply in Indian English.
${ctx.customerName ? `Customer name: ${ctx.customerName}.` : ""}
${ctx.customerBalance ? `Customer outstanding balance: ₹${ctx.customerBalance}.` : ""}

Available services:
${servicesText || "Please ask us directly for our service list."}

Customer message: "${customerMessage}"

Reply directly with only the message text. No quotes, no labels.`;

  if (ai) {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    return response.text?.trim() || fallbackReply(ctx.businessName);
  }

  return fallbackReply(ctx.businessName);
}

function fallbackReply(businessName: string): string {
  return `Thank you for reaching out to *${businessName}*! 🙏 Our team will respond to your query shortly. Have a great day!`;
}
