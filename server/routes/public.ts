import { Router } from "express";
import { z } from "zod";
import pool from "../db/pool.js";
import { validate } from "../middleware/validate.js";
import { sendWhatsAppText } from "../services/whatsapp.js";

const router = Router();

const PublicBookingSchema = z.object({
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: z.string().min(10, "Phone number must be at least 10 digits"),
  serviceId: z.string().uuid("Invalid service selection"),
  dateTime: z.string().datetime({ message: "Invalid date and time" }),
  notes: z.string().optional().nullable(),
});

// GET /api/public/business/:slug — Public page detail
router.get("/business/:slug", async (req, res) => {
  const { slug } = req.params;

  try {
    const bizResult = await pool.query(
      "SELECT id, name, type, upi_id, timezone FROM businesses WHERE slug = $1",
      [slug]
    );

    if (bizResult.rows.length === 0) {
      res.status(404).json({ error: "Business not found" });
      return;
    }

    const business = bizResult.rows[0];

    const servicesResult = await pool.query(
      `SELECT id, name, description, price, duration_min, category 
       FROM services 
       WHERE business_id = $1 AND is_active = TRUE 
       ORDER BY category, name`,
      [business.id]
    );

    res.json({
      business: {
        id: business.id,
        name: business.name,
        type: business.type,
        upiId: business.upi_id,
        timezone: business.timezone,
        slug,
      },
      services: servicesResult.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        price: parseFloat(r.price),
        durationMin: r.duration_min,
        category: r.category,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/bookings/:slug — Public slot booking
router.post("/bookings/:slug", validate(PublicBookingSchema), async (req, res) => {
  const { slug } = req.params;
  const { customerName, customerPhone, serviceId, dateTime, notes } = req.body;

  try {
    // 1. Fetch business
    const bizResult = await pool.query("SELECT * FROM businesses WHERE slug = $1", [slug]);
    if (bizResult.rows.length === 0) {
      res.status(404).json({ error: "Business not found" });
      return;
    }
    const biz = bizResult.rows[0];
    const bid = biz.id;

    // 2. Fetch service
    const serviceResult = await pool.query(
      "SELECT name, price FROM services WHERE id = $1 AND business_id = $2 AND is_active = TRUE",
      [serviceId, bid]
    );
    if (serviceResult.rows.length === 0) {
      res.status(404).json({ error: "Service not found or inactive" });
      return;
    }
    const service = serviceResult.rows[0];

    // 3. Resolve customer
    let customerId: string;
    const custResult = await pool.query(
      "SELECT id FROM customers WHERE business_id = $1 AND phone = $2",
      [bid, customerPhone]
    );

    if (custResult.rows.length > 0) {
      customerId = custResult.rows[0].id;
    } else {
      const newCust = await pool.query(
        "INSERT INTO customers (business_id, name, phone, tags) VALUES ($1, $2, $3, ARRAY['Public Booking']) RETURNING id",
        [bid, customerName, customerPhone]
      );
      customerId = newCust.rows[0].id;
    }

    // 4. Create booking
    const bookingResult = await pool.query(
      `INSERT INTO bookings (business_id, customer_id, service_id, customer_name, customer_phone, service_name, price, date_time, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [bid, customerId, serviceId, customerName, customerPhone, service.name, service.price, dateTime, notes || null]
    );
    const booking = bookingResult.rows[0];

    // 5. Send automated confirmation
    const formattedDate = new Date(dateTime).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const msgText = `Hello ${customerName}, your booking for *${service.name}* at *${biz.name}* on *${formattedDate}* is CONFIRMED! 📅 Price: ₹${parseFloat(service.price)}. Reply CANCEL to reschedule.`;

    try {
      const waMsg = await sendWhatsAppText({
        phone: customerPhone,
        text: msgText,
        businessWaPhoneId: biz.wa_phone_id,
        businessAccessToken: biz.wa_access_token,
        mode: biz.wa_mode,
      });

      // Log outgoing text
      await pool.query(
        `INSERT INTO messages (business_id, direction, from_addr, to_addr, body, is_auto_response, wa_message_id, status)
         VALUES ($1, 'outgoing', 'business', $2, $3, TRUE, $4, 'sent')`,
        [bid, customerPhone, msgText, waMsg.id]
      );
    } catch (waErr: any) {
      console.warn("Public booking WA notification failed:", waErr.message);
    }

    res.status(201).json({
      success: true,
      booking: {
        id: booking.id,
        customerName: booking.customer_name,
        customerPhone: booking.customer_phone,
        serviceName: booking.service_name,
        price: parseFloat(booking.price),
        dateTime: booking.date_time,
        status: booking.status,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
