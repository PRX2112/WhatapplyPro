import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendWhatsAppText } from "../services/whatsapp.js";
import { buildUpiLink } from "../services/upi.js";

const router = Router();

const EntrySchema = z.object({
  customerId: z.string().uuid(),
  type: z.enum(["debit", "credit"]),
  amount: z.number().positive("Amount must be greater than 0"),
  description: z.string().optional().nullable(),
});

// GET /api/ledger — All entries for business (with customer name)
router.get("/", requireAuth, async (req, res) => {
  const bid = req.auth!.businessId;
  const { customerId } = req.query;

  try {
    let query = `
      SELECT le.*, c.name AS customer_name, c.phone AS customer_phone
      FROM ledger_entries le
      JOIN customers c ON c.id = le.customer_id
      WHERE le.business_id = $1
    `;
    const params: any[] = [bid];

    if (customerId) {
      params.push(customerId);
      query += ` AND le.customer_id = $${params.length}`;
    }

    query += " ORDER BY le.created_at DESC LIMIT 200";
    const result = await pool.query(query, params);
    res.json(result.rows.map(mapEntry));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ledger/summary — Outstanding balance per customer
router.get("/summary", requireAuth, async (req, res) => {
  const bid = req.auth!.businessId;
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.phone, c.upi_id, c.tags,
              COALESCE(SUM(CASE WHEN le.type='debit' THEN le.amount ELSE -le.amount END), 0) AS outstanding
       FROM customers c
       LEFT JOIN ledger_entries le ON le.customer_id = c.id AND le.business_id = $1
       WHERE c.business_id = $1
       GROUP BY c.id
       HAVING COALESCE(SUM(CASE WHEN le.type='debit' THEN le.amount ELSE -le.amount END), 0) > 0
       ORDER BY outstanding DESC`,
      [bid]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ledger — Add debit or credit entry
router.post("/", requireAuth, validate(EntrySchema), async (req, res) => {
  const bid = req.auth!.businessId;
  const { customerId, type, amount, description } = req.body;

  try {
    // Verify customer belongs to this business
    const custCheck = await pool.query(
      "SELECT id FROM customers WHERE id=$1 AND business_id=$2",
      [customerId, bid]
    );
    if (custCheck.rows.length === 0) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO ledger_entries (business_id, customer_id, type, amount, description)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [bid, customerId, type, amount, description || null]
    );

    res.status(201).json(mapEntry(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ledger/remind — Send UPI payment reminder via WhatsApp
router.post("/remind", requireAuth, async (req, res) => {
  const bid = req.auth!.businessId;
  const { customerId, templateId } = req.body;

  if (!customerId) {
    res.status(400).json({ error: "customerId is required" });
    return;
  }

  try {
    // Get customer + outstanding balance
    const custResult = await pool.query(
      `SELECT c.*,
              COALESCE(SUM(CASE WHEN le.type='debit' THEN le.amount ELSE -le.amount END), 0) AS outstanding
       FROM customers c
       LEFT JOIN ledger_entries le ON le.customer_id = c.id
       WHERE c.id = $1 AND c.business_id = $2
       GROUP BY c.id`,
      [customerId, bid]
    );

    if (custResult.rows.length === 0) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    const customer = custResult.rows[0];
    const outstanding = parseFloat(customer.outstanding);

    if (outstanding <= 0) {
      res.status(400).json({ error: "Customer has no outstanding balance" });
      return;
    }

    // Get business info
    const biz = (await pool.query("SELECT * FROM businesses WHERE id=$1", [bid])).rows[0];

    // Build UPI link
    const upiId = customer.upi_id || biz.upi_id;
    const upiLink = buildUpiLink({
      pa: upiId || "business@upi",
      pn: biz.name,
      am: outstanding,
      tn: `Payment to ${biz.name}`,
    });

    // Get template (optional)
    let msgText = `Namaste ${customer.name} Ji 🙏 This is a gentle reminder from *${biz.name}* regarding your outstanding balance of *₹${outstanding}*. Please pay via UPI: ${upiLink}. Thank you!`;

    if (templateId) {
      const tmpl = (await pool.query("SELECT * FROM wa_templates WHERE id=$1 AND business_id=$2", [templateId, bid])).rows[0];
      if (tmpl) {
        msgText = tmpl.body_text
          .replace(/\{\{customer_name\}\}/g, customer.name)
          .replace(/\{\{business_name\}\}/g, biz.name)
          .replace(/\{\{amount\}\}/g, outstanding.toString())
          .replace(/\{\{upi_link\}\}/g, upiLink);
      }
    }

    // Send via WhatsApp
    const waMsg = await sendWhatsAppText({
      phone: customer.phone,
      text: msgText,
      businessWaPhoneId: biz.wa_phone_id,
      businessAccessToken: biz.wa_access_token,
      mode: biz.wa_mode,
    });

    // Log to messages
    await pool.query(
      `INSERT INTO messages (business_id, direction, from_addr, to_addr, body, is_auto_response, wa_message_id, status)
       VALUES ($1,'outgoing','business',$2,$3,TRUE,$4,'sent')`,
      [bid, customer.phone, msgText, waMsg.id]
    );

    res.json({ success: true, message: msgText, upiLink });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ledger/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM ledger_entries WHERE id=$1 AND business_id=$2", [
      req.params.id,
      req.auth!.businessId,
    ]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function mapEntry(row: any) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    type: row.type,
    amount: parseFloat(row.amount),
    description: row.description,
    bookingId: row.booking_id,
    createdAt: row.created_at,
  };
}

export default router;
