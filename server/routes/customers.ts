import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();

const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(6, "Phone number required"),
  email: z.string().email().optional().nullable(),
  upiId: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

// GET /api/customers — List with outstanding balance computed from ledger
router.get("/", requireAuth, async (req, res) => {
  const bid = req.auth!.businessId;
  const { q, tag } = req.query;

  try {
    let query = `
      SELECT c.*,
        COALESCE(SUM(CASE WHEN le.type='debit' THEN le.amount ELSE -le.amount END), 0) AS outstanding_amount
      FROM customers c
      LEFT JOIN ledger_entries le ON le.customer_id = c.id
      WHERE c.business_id = $1
    `;
    const params: any[] = [bid];

    if (q) {
      params.push(`%${q}%`);
      query += ` AND (c.name ILIKE $${params.length} OR c.phone ILIKE $${params.length})`;
    }
    if (tag) {
      params.push(tag);
      query += ` AND $${params.length} = ANY(c.tags)`;
    }

    query += " GROUP BY c.id ORDER BY c.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows.map(mapCustomer));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:id
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
         COALESCE(SUM(CASE WHEN le.type='debit' THEN le.amount ELSE -le.amount END), 0) AS outstanding_amount
       FROM customers c
       LEFT JOIN ledger_entries le ON le.customer_id = c.id
       WHERE c.id = $1 AND c.business_id = $2
       GROUP BY c.id`,
      [req.params.id, req.auth!.businessId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json(mapCustomer(result.rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/customers — Create or update
router.post("/", requireAuth, validate(CustomerSchema), async (req, res) => {
  const bid = req.auth!.businessId;
  const { id, name, phone, email, upiId, note, tags } = req.body;

  try {
    if (id) {
      // Update existing
      const result = await pool.query(
        `UPDATE customers
         SET name=$1, phone=$2, email=$3, upi_id=$4, note=$5, tags=$6, updated_at=NOW()
         WHERE id=$7 AND business_id=$8 RETURNING *`,
        [name, phone, email || null, upiId || null, note || null, tags || [], id, bid]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      res.json(mapCustomer(result.rows[0]));
    } else {
      // Create new
      const result = await pool.query(
        `INSERT INTO customers (business_id, name, phone, email, upi_id, note, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [bid, name, phone, email || null, upiId || null, note || null, tags || []]
      );
      res.status(201).json(mapCustomer(result.rows[0]));
    }
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ error: "A customer with this phone number already exists" });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// DELETE /api/customers/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM customers WHERE id=$1 AND business_id=$2", [
      req.params.id,
      req.auth!.businessId,
    ]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function mapCustomer(row: any) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    upiId: row.upi_id,
    note: row.note,
    tags: row.tags || [],
    outstandingAmount: parseFloat(row.outstanding_amount || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default router;
