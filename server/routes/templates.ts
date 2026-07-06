import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const TemplateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  category: z.enum(["UTILITY", "MARKETING", "AUTHENTICATION"]).default("UTILITY"),
  language: z.string().default("en"),
  bodyText: z.string().min(1),
});

// GET /api/templates
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM wa_templates WHERE business_id=$1 ORDER BY created_at DESC",
      [req.auth!.businessId]
    );
    res.json(result.rows.map(mapTemplate));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/templates
router.post("/", requireAuth, validate(TemplateSchema), async (req, res) => {
  const bid = req.auth!.businessId;
  const { id, name, category, language, bodyText } = req.body;

  // Extract placeholders
  const placeholders = Array.from(
    new Set([...bodyText.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]))
  );

  const slugName = name.toLowerCase().replace(/\s+/g, "_");

  try {
    if (id) {
      const result = await pool.query(
        `UPDATE wa_templates SET name=$1, category=$2, language=$3, body_text=$4, placeholders=$5
         WHERE id=$6 AND business_id=$7 RETURNING *`,
        [slugName, category, language, bodyText, placeholders, id, bid]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Template not found" });
        return;
      }
      res.json(mapTemplate(result.rows[0]));
    } else {
      const result = await pool.query(
        `INSERT INTO wa_templates (business_id, name, category, language, body_text, placeholders, status)
         VALUES ($1,$2,$3,$4,$5,$6,'APPROVED') RETURNING *`,
        [bid, slugName, category, language, bodyText, placeholders]
      );
      res.status(201).json(mapTemplate(result.rows[0]));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/templates/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM wa_templates WHERE id=$1 AND business_id=$2", [
      req.params.id,
      req.auth!.businessId,
    ]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function mapTemplate(row: any) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    language: row.language,
    bodyText: row.body_text,
    placeholders: row.placeholders || [],
    status: row.status,
    createdAt: row.created_at,
  };
}

export default router;
