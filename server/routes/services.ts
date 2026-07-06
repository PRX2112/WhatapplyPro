import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const ServiceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional().nullable(),
  price: z.number().min(0),
  durationMin: z.number().int().min(1).default(30),
  category: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

// GET /api/services
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM services WHERE business_id = $1 ORDER BY category NULLS LAST, name ASC",
      [req.auth!.businessId]
    );
    res.json(result.rows.map(mapService));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/services — Create or update
router.post("/", requireAuth, validate(ServiceSchema), async (req, res) => {
  const bid = req.auth!.businessId;
  const { id, name, description, price, durationMin, category, isActive } = req.body;

  try {
    if (id) {
      const result = await pool.query(
        `UPDATE services SET name=$1, description=$2, price=$3, duration_min=$4, category=$5, is_active=$6
         WHERE id=$7 AND business_id=$8 RETURNING *`,
        [name, description || null, price, durationMin, category || null, isActive ?? true, id, bid]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Service not found" });
        return;
      }
      res.json(mapService(result.rows[0]));
    } else {
      const result = await pool.query(
        `INSERT INTO services (business_id, name, description, price, duration_min, category, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [bid, name, description || null, price, durationMin, category || null, isActive ?? true]
      );
      res.status(201).json(mapService(result.rows[0]));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/services/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM services WHERE id=$1 AND business_id=$2", [
      req.params.id,
      req.auth!.businessId,
    ]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/services/public/:businessId — Public endpoint for booking page
router.get("/public/:businessId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.description, s.price, s.duration_min, s.category,
              b.name as business_name, b.type as business_type
       FROM services s JOIN businesses b ON b.id = s.business_id
       WHERE s.business_id = $1 AND s.is_active = TRUE
       ORDER BY s.category NULLS LAST, s.name ASC`,
      [req.params.businessId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Business or services not found" });
      return;
    }
    res.json({
      businessName: result.rows[0].business_name,
      businessType: result.rows[0].business_type,
      services: result.rows.map(mapService),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function mapService(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: parseFloat(row.price),
    durationMin: row.duration_min,
    category: row.category,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export default router;
