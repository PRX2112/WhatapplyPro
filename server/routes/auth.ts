import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import pool from "../db/pool.js";
import { generateToken, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const RegisterSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  businessType: z.string().default("general"),
  name: z.string().min(2, "Your name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessUpiId: z.string().optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post("/register", validate(RegisterSchema), async (req, res) => {
  const { businessName, businessType, name, email, password, businessUpiId } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check if email exists
    const existing = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    // Create business slug
    const cleanSlug = businessName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    let slug = cleanSlug;
    const slugCheck = await client.query("SELECT id FROM businesses WHERE slug = $1", [slug]);
    if (slugCheck.rows.length > 0) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Create business
    const bizResult = await client.query(
      `INSERT INTO businesses (name, slug, type, upi_id) VALUES ($1, $2, $3, $4) RETURNING *`,
      [businessName, slug, businessType || "general", businessUpiId || null]
    );
    const business = bizResult.rows[0];

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (business_id, email, password_hash, name, role) VALUES ($1, $2, $3, $4, 'owner') RETURNING id, name, email, role, business_id, has_seen_guide, created_at`,
      [business.id, email.toLowerCase(), passwordHash, name]
    );
    const user = userResult.rows[0];

    // Seed default templates for new business
    await client.query(
      `INSERT INTO wa_templates (business_id, name, category, body_text, placeholders, status) VALUES
        ($1, 'payment_reminder', 'UTILITY', 'Namaste {{customer_name}} Ji 🙏 This is a friendly reminder from *{{business_name}}* regarding your outstanding balance of *₹{{amount}}*. Pay via UPI: {{upi_link}}. Thank you!', ARRAY['customer_name','business_name','amount','upi_link'], 'APPROVED'),
        ($1, 'booking_confirmation', 'UTILITY', 'Hello {{customer_name}}, your booking for *{{service_name}}* at *{{business_name}}* on *{{date_time}}* is CONFIRMED! 📅 Price: ₹{{price}}. Reply CANCEL to reschedule.', ARRAY['customer_name','service_name','business_name','date_time','price'], 'APPROVED'),
        ($1, 'festive_offer', 'MARKETING', 'Hi {{customer_name}}! 🎉 Special offer from *{{business_name}}*! Get *20% OFF* on all services this week. Reply BOOK to grab your slot! 🛍️✨', ARRAY['customer_name','business_name'], 'APPROVED')`,
      [business.id]
    );

    await client.query("COMMIT");

    const token = generateToken({
      userId: user.id,
      businessId: business.id,
      role: user.role,
    });

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, hasSeenGuide: user.has_seen_guide },
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        type: business.type,
        upiId: business.upi_id,
        waMode: business.wa_mode,
      },
    });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post("/login", validate(LoginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.password_hash, u.business_id, u.has_seen_guide,
              b.name as business_name, b.slug, b.type as business_type, b.upi_id, b.wa_mode,
              b.wa_phone_id, b.wa_access_token, b.wa_waba_id, b.timezone
       FROM users u JOIN businesses b ON b.id = u.business_id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const row = result.rows[0];
    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const token = generateToken({
      userId: row.id,
      businessId: row.business_id,
      role: row.role,
    });

    res.json({
      token,
      user: { id: row.id, name: row.name, email: row.email, role: row.role, hasSeenGuide: row.has_seen_guide },
      business: {
        id: row.business_id,
        name: row.business_name,
        slug: row.slug,
        type: row.business_type,
        upiId: row.upi_id,
        waMode: row.wa_mode,
        waPhoneId: row.wa_phone_id,
        waWabaId: row.wa_waba_id,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.has_seen_guide,
              b.id as business_id, b.name as business_name, b.slug, b.type as business_type,
              b.upi_id, b.wa_mode, b.wa_phone_id, b.wa_waba_id, b.timezone
       FROM users u JOIN businesses b ON b.id = u.business_id
       WHERE u.id = $1`,
      [req.auth!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const row = result.rows[0];
    res.json({
      user: { id: row.id, name: row.name, email: row.email, role: row.role, hasSeenGuide: row.has_seen_guide },
      business: {
        id: row.business_id,
        name: row.business_name,
        slug: row.slug,
        type: row.business_type,
        upiId: row.upi_id,
        waMode: row.wa_mode,
        waPhoneId: row.wa_phone_id,
        waWabaId: row.wa_waba_id,
        timezone: row.timezone,
      },
    });
  } catch (err: any) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

// POST /api/auth/seen-guide
router.post("/seen-guide", requireAuth, async (req, res) => {
  try {
    await pool.query("UPDATE users SET has_seen_guide = TRUE WHERE id = $1", [req.auth!.userId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Seen guide error:", err);
    res.status(500).json({ error: "Failed to update guide status" });
  }
});

export default router;
