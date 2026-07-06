import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { generateChatReply } from "../services/gemini.js";
import { buildUpiLink } from "../services/upi.js";

const router = Router();

const IncomingSchema = z.object({
  phone: z.string().min(6),
  text: z.string().min(1),
});

// GET /api/sandbox/messages
router.get("/messages", requireAuth, async (req, res) => {
  const bid = req.auth!.businessId;
  try {
    const result = await pool.query(
      "SELECT * FROM messages WHERE business_id=$1 ORDER BY created_at ASC LIMIT 200",
      [bid]
    );
    res.json(result.rows.map(mapMessage));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sandbox/incoming — Simulate an incoming customer message
router.post("/incoming", requireAuth, validate(IncomingSchema), async (req, res) => {
  const bid = req.auth!.businessId;
  const { phone, text } = req.body;

  try {
    const biz = (await pool.query("SELECT * FROM businesses WHERE id=$1", [bid])).rows[0];
    const services = (await pool.query(
      "SELECT name, price, duration_min FROM services WHERE business_id=$1 AND is_active=TRUE LIMIT 10",
      [bid]
    )).rows;

    // Save incoming message
    await pool.query(
      `INSERT INTO messages (business_id, direction, from_addr, to_addr, body, status)
       VALUES ($1,'incoming',$2,'business',$3,'delivered')`,
      [bid, phone, text]
    );

    // Find customer (if known)
    const custResult = await pool.query(
      "SELECT * FROM customers WHERE business_id=$1 AND REPLACE(phone,' ','') = REPLACE($2,' ','')",
      [bid, phone]
    );
    const customer = custResult.rows[0];

    // Keyword-based smart routing
    const lower = text.toLowerCase().trim();
    let responseText = "";

    if (lower === "hi" || lower === "hello" || lower === "namaste" || lower === "hey") {
      responseText = `Namaste! Welcome to *${biz.name}* 🙏\n\nHow can we help you today?\n• Reply *SERVICES* to view our offerings\n• Reply *BOOK* to schedule an appointment\n• Reply *BAL* to check your account balance\n\nOr just type your question!`;
    } else if (lower === "services" || lower === "menu" || lower === "pricing") {
      if (services.length > 0) {
        const list = services.map((s, i) => `${i + 1}. ${s.name} — ₹${s.price} (${s.duration_min} min)`).join("\n");
        responseText = `📋 *${biz.name} — Services Menu*\n\n${list}\n\nReply *BOOK* to schedule an appointment!`;
      } else {
        responseText = `Please contact *${biz.name}* directly for our current service menu and pricing. 🙏`;
      }
    } else if (lower === "book" || lower === "appointment" || lower === "reserve") {
      responseText = `📅 *Book an Appointment*\n\nTo make a reservation, please share:\n1. Your name\n2. Service you'd like\n3. Preferred date & time\n\nOr book online at our booking page!`;
    } else if (lower === "bal" || lower === "balance" || lower === "khata") {
      if (customer) {
        const balResult = await pool.query(
          `SELECT COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE -amount END),0) as outstanding
           FROM ledger_entries WHERE customer_id=$1`,
          [customer.id]
        );
        const outstanding = parseFloat(balResult.rows[0].outstanding || 0);

        if (outstanding > 0) {
          const upiLink = buildUpiLink({
            pa: customer.upi_id || biz.upi_id || "business@upi",
            pn: biz.name,
            am: outstanding,
            tn: `Payment to ${biz.name}`,
          });
          responseText = `💳 *Account Balance — ${customer.name}*\n\nOutstanding: *₹${outstanding}*\n\nPay instantly via UPI 👇\n${upiLink}`;
        } else {
          responseText = `✅ *${customer.name}*, your account is clear! No outstanding dues. Thank you! 🙏`;
        }
      } else {
        responseText = `We couldn't find your account. Please contact *${biz.name}* and we'll look up your balance! 📞`;
      }
    } else if (lower === "cancel") {
      responseText = `No problem at all! If you'd like to reschedule, just reply *BOOK* and we'll find a suitable slot. Have a wonderful day! 😊`;
    } else {
      // AI-powered response
      responseText = await generateChatReply(text, {
        businessName: biz.name,
        businessType: biz.type,
        services,
        customerName: customer?.name,
        customerBalance: customer ? undefined : undefined,
      });
    }

    // Save outgoing response
    const outResult = await pool.query(
      `INSERT INTO messages (business_id, direction, from_addr, to_addr, body, is_auto_response, status)
       VALUES ($1,'outgoing','business',$2,$3,TRUE,'sent') RETURNING *`,
      [bid, phone, responseText]
    );

    const allMessages = (await pool.query(
      "SELECT * FROM messages WHERE business_id=$1 ORDER BY created_at ASC LIMIT 200",
      [bid]
    )).rows.map(mapMessage);

    res.json({
      success: true,
      reply: mapMessage(outResult.rows[0]),
      messages: allMessages,
    });
  } catch (err: any) {
    console.error("Sandbox incoming error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sandbox/clear
router.post("/clear", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM messages WHERE business_id=$1", [req.auth!.businessId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function mapMessage(row: any) {
  return {
    id: row.id,
    direction: row.direction,
    from: row.from_addr,
    to: row.to_addr,
    text: row.body,
    isAutoResponse: row.is_auto_response,
    status: row.status,
    timestamp: row.created_at,
  };
}

export default router;
