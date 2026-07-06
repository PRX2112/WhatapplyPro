import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const UpdateBusinessSchema = z.object({
  name: z.string().min(2).optional(),
  type: z.string().optional(),
  upiId: z.string().optional().nullable(),
  waPhoneId: z.string().optional().nullable(),
  waAccessToken: z.string().optional().nullable(),
  waWabaId: z.string().optional().nullable(),
  waMode: z.enum(["sandbox", "production"]).optional(),
  timezone: z.string().optional(),
});

// GET /api/business
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM businesses WHERE id = $1", [req.auth!.businessId]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const b = result.rows[0];
    res.json({
      id: b.id,
      name: b.name,
      slug: b.slug,
      type: b.type,
      upiId: b.upi_id,
      waPhoneId: b.wa_phone_id,
      waAccessToken: b.wa_access_token,
      waWabaId: b.wa_waba_id,
      waMode: b.wa_mode,
      timezone: b.timezone,
      createdAt: b.created_at,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/business
router.put("/", requireAuth, validate(UpdateBusinessSchema), async (req, res) => {
  const { name, type, upiId, waPhoneId, waAccessToken, waWabaId, waMode, timezone } = req.body;
  try {
    let slug = null;
    if (name) {
      const cleanSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
      
      slug = cleanSlug;
      const slugCheck = await pool.query("SELECT id FROM businesses WHERE slug = $1 AND id != $2", [slug, req.auth!.businessId]);
      if (slugCheck.rows.length > 0) {
        slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
      }
    }

    const result = await pool.query(
      `UPDATE businesses
       SET name = COALESCE($1, name),
           slug = COALESCE($2, slug),
           type = COALESCE($3, type),
           upi_id = COALESCE($4, upi_id),
           wa_phone_id = COALESCE($5, wa_phone_id),
           wa_access_token = COALESCE($6, wa_access_token),
           wa_waba_id = COALESCE($7, wa_waba_id),
           wa_mode = COALESCE($8, wa_mode),
           timezone = COALESCE($9, timezone),
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [name, slug, type, upiId, waPhoneId, waAccessToken, waWabaId, waMode, timezone, req.auth!.businessId]
    );
    const b = result.rows[0];
    res.json({
      id: b.id,
      name: b.name,
      slug: b.slug,
      type: b.type,
      upiId: b.upi_id,
      waPhoneId: b.wa_phone_id,
      waAccessToken: b.wa_access_token,
      waWabaId: b.wa_waba_id,
      waMode: b.wa_mode,
      timezone: b.timezone,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/business/stats — Dashboard summary counts
router.get("/stats", requireAuth, async (req, res) => {
  const bid = req.auth!.businessId;
  try {
    const [custR, bookR, msgR, revR, campaignR] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM customers WHERE business_id = $1", [bid]),
      pool.query("SELECT COUNT(*), status FROM bookings WHERE business_id = $1 GROUP BY status", [bid]),
      pool.query("SELECT COUNT(*) FROM messages WHERE business_id = $1 AND created_at > NOW() - INTERVAL '30 days'", [bid]),
      pool.query(
        `SELECT COALESCE(SUM(CASE WHEN type='debit' THEN amount ELSE 0 END),0) as total_debit,
                COALESCE(SUM(CASE WHEN type='credit' THEN amount ELSE 0 END),0) as total_credit
         FROM ledger_entries WHERE business_id = $1`,
        [bid]
      ),
      pool.query("SELECT COUNT(*) FROM campaigns WHERE business_id = $1", [bid]),
    ]);

    const bookingsByStatus = Object.fromEntries(
      bookR.rows.map((r) => [r.status, parseInt(r.count)])
    );

    res.json({
      totalCustomers: parseInt(custR.rows[0].count),
      totalBookings: Object.values(bookingsByStatus).reduce((a, b) => a + b, 0),
      pendingBookings: bookingsByStatus.pending || 0,
      confirmedBookings: bookingsByStatus.confirmed || 0,
      completedBookings: bookingsByStatus.completed || 0,
      cancelledBookings: bookingsByStatus.cancelled || 0,
      messagesLast30Days: parseInt(msgR.rows[0].count),
      totalRevenue: parseFloat(revR.rows[0].total_credit),
      totalOutstanding: parseFloat(revR.rows[0].total_debit) - parseFloat(revR.rows[0].total_credit),
      totalCampaigns: parseInt(campaignR.rows[0].count),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
