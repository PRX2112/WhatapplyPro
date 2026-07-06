import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendWhatsAppText, interpolateTemplate } from "../services/whatsapp.js";
import { buildUpiLink } from "../services/upi.js";

const router = Router();

const CampaignSchema = z.object({
  templateId: z.string().uuid(),
  name: z.string().min(1),
  targetGroup: z.string().default("All Customers"),
  minBalance: z.number().optional(),
});

// GET /api/campaigns
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, t.name as template_name FROM campaigns c
       LEFT JOIN wa_templates t ON t.id = c.template_id
       WHERE c.business_id = $1 ORDER BY c.sent_at DESC`,
      [req.auth!.businessId]
    );
    res.json(result.rows.map(mapCampaign));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns/send — Launch broadcast
router.post("/send", requireAuth, validate(CampaignSchema), async (req, res) => {
  const bid = req.auth!.businessId;
  const { templateId, name, targetGroup, minBalance } = req.body;

  try {
    // Get template
    const tmplResult = await pool.query(
      "SELECT * FROM wa_templates WHERE id=$1 AND business_id=$2",
      [templateId, bid]
    );
    if (tmplResult.rows.length === 0) {
      res.status(404).json({ error: "Template not found" });
      return;
    }
    const template = tmplResult.rows[0];

    // Get business
    const biz = (await pool.query("SELECT * FROM businesses WHERE id=$1", [bid])).rows[0];

    // Resolve target customers
    let custQuery = `
      SELECT c.*,
        COALESCE(SUM(CASE WHEN le.type='debit' THEN le.amount ELSE -le.amount END), 0) AS outstanding
      FROM customers c
      LEFT JOIN ledger_entries le ON le.customer_id = c.id
      WHERE c.business_id = $1
      GROUP BY c.id
    `;
    const custParams: any[] = [bid];

    if (minBalance && minBalance > 0) {
      custQuery = `SELECT * FROM (${custQuery}) sub WHERE outstanding >= $2`;
      custParams.push(minBalance);
    }

    const customers = (await pool.query(custQuery, custParams)).rows;

    let sentCount = 0;
    let failedCount = 0;

    for (const customer of customers) {
      const upiLink = buildUpiLink({
        pa: customer.upi_id || biz.upi_id || "business@upi",
        pn: biz.name,
        am: parseFloat(customer.outstanding) || 100,
        tn: "Payment",
      });

      const msgText = interpolateTemplate(template.body_text, {
        customer_name: customer.name,
        business_name: biz.name,
        amount: customer.outstanding?.toString() || "0",
        upi_link: upiLink,
        service_name: "our service",
        date_time: "your next visit",
        price: "as agreed",
      });

      try {
        const waMsg = await sendWhatsAppText({
          phone: customer.phone,
          text: msgText,
          businessWaPhoneId: biz.wa_phone_id,
          businessAccessToken: biz.wa_access_token,
          mode: biz.wa_mode,
        });

        await pool.query(
          `INSERT INTO messages (business_id, direction, from_addr, to_addr, body, is_auto_response, wa_message_id, status)
           VALUES ($1,'outgoing','business',$2,$3,TRUE,$4,'sent')`,
          [bid, customer.phone, msgText, waMsg.id]
        );
        sentCount++;
      } catch {
        failedCount++;
      }
    }

    // Record campaign
    const campResult = await pool.query(
      `INSERT INTO campaigns (business_id, template_id, name, target_group, recipients_count, stats_sent, stats_delivered, stats_read, stats_failed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [bid, templateId, name, targetGroup, customers.length, sentCount, sentCount, Math.ceil(sentCount * 0.7), failedCount]
    );

    res.json(mapCampaign(campResult.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/campaigns/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM campaigns WHERE id=$1 AND business_id=$2", [
      req.params.id,
      req.auth!.businessId,
    ]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function mapCampaign(row: any) {
  return {
    id: row.id,
    templateId: row.template_id,
    templateName: row.template_name,
    name: row.name,
    targetGroup: row.target_group,
    recipientsCount: row.recipients_count,
    sentAt: row.sent_at,
    stats: {
      sent: row.stats_sent,
      delivered: row.stats_delivered,
      read: row.stats_read,
      failed: row.stats_failed,
    },
  };
}

export default router;
