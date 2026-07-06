import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { sendWhatsAppText, interpolateTemplate } from "../services/whatsapp.js";
import { buildUpiLink } from "../services/upi.js";

const router = Router();

const BookingSchema = z.object({
  id: z.string().uuid().optional(),
  customerId: z.string().uuid().optional().nullable(),
  serviceId: z.string().uuid().optional().nullable(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(6),
  serviceName: z.string().min(1),
  price: z.number().min(0),
  dateTime: z.string().min(1),
  notes: z.string().optional().nullable(),
  staffName: z.string().optional().nullable(),
});

const StatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
});

// GET /api/bookings
router.get("/", requireAuth, async (req, res) => {
  const bid = req.auth!.businessId;
  const { status, from, to } = req.query;

  try {
    let query = "SELECT * FROM bookings WHERE business_id = $1 AND is_deleted = FALSE";
    const params: any[] = [bid];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (from) {
      params.push(from);
      query += ` AND date_time >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      query += ` AND date_time <= $${params.length}`;
    }

    query += " ORDER BY date_time ASC";
    const result = await pool.query(query, params);
    res.json(result.rows.map(mapBooking));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings — Create or update
router.post("/", requireAuth, validate(BookingSchema), async (req, res) => {
  const bid = req.auth!.businessId;
  const { id, customerId, serviceId, customerName, customerPhone, serviceName, price, dateTime, notes, staffName } = req.body;

  try {
    // Get business settings for WA messaging
    const bizResult = await pool.query("SELECT * FROM businesses WHERE id = $1", [bid]);
    const biz = bizResult.rows[0];

    if (id) {
      // Get the old booking status and price
      const oldBookingRes = await pool.query(
        "SELECT status, price FROM bookings WHERE id = $1 AND business_id = $2 AND is_deleted = FALSE",
        [id, bid]
      );
      const oldBooking = oldBookingRes.rows[0];

      // Update
      const result = await pool.query(
        `UPDATE bookings SET customer_id=$1, service_id=$2, customer_name=$3, customer_phone=$4,
         service_name=$5, price=$6, date_time=$7, notes=$8, staff_name=$9, updated_at=NOW()
         WHERE id=$10 AND business_id=$11 AND is_deleted = FALSE RETURNING *`,
        [customerId || null, serviceId || null, customerName, customerPhone, serviceName, price, dateTime, notes || null, staffName || null, id, bid]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: "Booking not found" });
        return;
      }
      const updatedBooking = result.rows[0];

      // If booking was completed, and price changed, update ledger entry
      if (oldBooking && updatedBooking.status === "completed" && parseFloat(oldBooking.price) !== updatedBooking.price) {
        await pool.query(
          "UPDATE ledger_entries SET amount = $1 WHERE business_id = $2 AND booking_id = $3",
          [updatedBooking.price, bid, updatedBooking.id]
        );
      }

      res.json(mapBooking(updatedBooking));
    } else {
      // Create - lookup or create customer first
      let finalCustomerId = customerId;
      if (!finalCustomerId) {
        const custResult = await pool.query(
          "SELECT id FROM customers WHERE business_id = $1 AND phone = $2",
          [bid, customerPhone]
        );
        if (custResult.rows.length > 0) {
          finalCustomerId = custResult.rows[0].id;
        } else {
          const newCust = await pool.query(
            "INSERT INTO customers (business_id, name, phone, tags) VALUES ($1, $2, $3, ARRAY['New']) RETURNING id",
            [bid, customerName, customerPhone]
          );
          finalCustomerId = newCust.rows[0].id;
        }
      }

      const result = await pool.query(
        `INSERT INTO bookings (business_id, customer_id, service_id, customer_name, customer_phone, service_name, price, date_time, notes, staff_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [bid, finalCustomerId || null, serviceId || null, customerName, customerPhone, serviceName, price, dateTime, notes || null, staffName || null]
      );
      const booking = result.rows[0];

      // Auto-send WhatsApp confirmation
      const formattedDate = new Date(dateTime).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const msgText = `Hello ${customerName}, your booking for *${serviceName}* at *${biz.name}* on *${formattedDate}* is CONFIRMED! 📅 Price: ₹${price}. Reply CANCEL to reschedule.`;

      try {
        const waMsg = await sendWhatsAppText({
          phone: customerPhone,
          text: msgText,
          businessWaPhoneId: biz.wa_phone_id,
          businessAccessToken: biz.wa_access_token,
          mode: biz.wa_mode,
        });

        // Log to messages table
        await pool.query(
          `INSERT INTO messages (business_id, direction, from_addr, to_addr, body, is_auto_response, wa_message_id, status)
           VALUES ($1,'outgoing','business',$2,$3,TRUE,$4,'sent')`,
          [bid, customerPhone, msgText, waMsg.id]
        );
      } catch (waErr: any) {
        console.warn("WA notification failed:", waErr.message);
      }

      res.status(201).json(mapBooking(booking));
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/:id/status
router.post("/:id/status", requireAuth, validate(StatusSchema), async (req, res) => {
  const bid = req.auth!.businessId;
  const { status } = req.body;

  try {
    const result = await pool.query(
      "UPDATE bookings SET status=$1, updated_at=NOW() WHERE id=$2 AND business_id=$3 AND is_deleted = FALSE RETURNING *",
      [status, req.params.id, bid]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    const booking = result.rows[0];
    const biz = (await pool.query("SELECT * FROM businesses WHERE id=$1", [bid])).rows[0];

    // Ledger Integration
    if (status === "completed") {
      const existingLedger = await pool.query(
        "SELECT id FROM ledger_entries WHERE business_id = $1 AND booking_id = $2",
        [bid, booking.id]
      );
      if (existingLedger.rows.length === 0) {
        await pool.query(
          `INSERT INTO ledger_entries (business_id, customer_id, type, amount, description, booking_id)
           VALUES ($1, $2, 'debit', $3, $4, $5)`,
          [bid, booking.customer_id, booking.price, `Completed Appointment: ${booking.service_name}`, booking.id]
        );
      }
    } else {
      // Reverted status from completed - delete the associated ledger entry
      await pool.query(
        "DELETE FROM ledger_entries WHERE business_id = $1 AND booking_id = $2",
        [bid, booking.id]
      );
    }

    // Send status update via WhatsApp
    if (status === "confirmed" || status === "cancelled") {
      const msgText = `Update from *${biz.name}*: Your appointment for *${booking.service_name}* is now *${status.toUpperCase()}*. ${status === "cancelled" ? "Please contact us to reschedule." : "We look forward to seeing you! 🙏"}`;
      try {
        const waMsg = await sendWhatsAppText({
          phone: booking.customer_phone,
          text: msgText,
          businessWaPhoneId: biz.wa_phone_id,
          businessAccessToken: biz.wa_access_token,
          mode: biz.wa_mode,
        });
        await pool.query(
          `INSERT INTO messages (business_id, direction, from_addr, to_addr, body, is_auto_response, wa_message_id, status)
           VALUES ($1,'outgoing','business',$2,$3,TRUE,$4,'sent')`,
          [bid, booking.customer_phone, msgText, waMsg.id]
        );
      } catch (waErr: any) {
        console.warn("WA status notification failed:", waErr.message);
      }
    }

    res.json(mapBooking(booking));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/bookings/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const bid = req.auth!.businessId;
  const bookingId = req.params.id;
  try {
    await pool.query(
      "UPDATE bookings SET is_deleted = TRUE, updated_at = NOW() WHERE id=$1 AND business_id=$2",
      [bookingId, bid]
    );
    // Delete corresponding ledger entry if it was completed
    await pool.query(
      "DELETE FROM ledger_entries WHERE business_id = $1 AND booking_id = $2",
      [bid, bookingId]
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/public — Public booking (no auth, used by customer booking page)
router.post("/public", async (req, res) => {
  const { businessId, customerName, customerPhone, serviceId, serviceName, price, dateTime, notes } = req.body;

  if (!businessId || !customerName || !customerPhone || !serviceName || !dateTime) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const bizResult = await pool.query("SELECT * FROM businesses WHERE id = $1", [businessId]);
    if (bizResult.rows.length === 0) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const biz = bizResult.rows[0];

    let finalCustomerId = null;
    const custResult = await pool.query(
      "SELECT id FROM customers WHERE business_id = $1 AND phone = $2",
      [businessId, customerPhone]
    );
    if (custResult.rows.length > 0) {
      finalCustomerId = custResult.rows[0].id;
    } else {
      const newCust = await pool.query(
        "INSERT INTO customers (business_id, name, phone, tags) VALUES ($1, $2, $3, ARRAY['Public']) RETURNING id",
        [businessId, customerName, customerPhone]
      );
      finalCustomerId = newCust.rows[0].id;
    }

    const result = await pool.query(
      `INSERT INTO bookings (business_id, customer_id, service_id, customer_name, customer_phone, service_name, price, date_time, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [businessId, finalCustomerId, serviceId || null, customerName, customerPhone, serviceName, price || 0, dateTime, notes || null]
    );

    const booking = result.rows[0];

    // Auto-send WhatsApp confirmation
    const formattedDate = new Date(dateTime).toLocaleString("en-IN", {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
    const msgText = `Hello ${customerName}, your booking for *${serviceName}* at *${biz.name}* on *${formattedDate}* is received! We will confirm shortly. 🙏`;

    try {
      await sendWhatsAppText({
        phone: customerPhone,
        text: msgText,
        businessWaPhoneId: biz.wa_phone_id,
        businessAccessToken: biz.wa_access_token,
        mode: biz.wa_mode,
      });
    } catch {}

    res.status(201).json({ success: true, booking: mapBooking(booking) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function mapBooking(row: any) {
  return {
    id: row.id,
    customerId: row.customer_id,
    serviceId: row.service_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    serviceName: row.service_name,
    price: parseFloat(row.price),
    dateTime: row.date_time,
    status: row.status,
    notes: row.notes,
    staffName: row.staff_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default router;
