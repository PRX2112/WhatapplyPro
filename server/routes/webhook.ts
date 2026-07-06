import { Router, Request, Response } from "express";
import pool from "../db/pool.js";

const router = Router();

const WA_VERIFY_TOKEN = process.env.WA_VERIFY_TOKEN || "whatapply-webhook-token";

// GET /api/webhook — Meta webhook verification
router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WA_VERIFY_TOKEN) {
    console.log("✅ Meta WhatsApp webhook verified.");
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: "Verification failed" });
  }
});

// POST /api/webhook — Receive incoming messages & status updates
router.post("/", async (req: Request, res: Response) => {
  const body = req.body;

  // Always respond 200 immediately (Meta requires fast ACK)
  res.sendStatus(200);

  try {
    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry || []) {
      const wabaId = entry.id;

      // Find which business this webhook belongs to
      const bizResult = await pool.query(
        "SELECT id FROM businesses WHERE wa_waba_id=$1",
        [wabaId]
      );
      const businessId = bizResult.rows[0]?.id;

      // Log raw event
      await pool.query(
        `INSERT INTO webhook_events (business_id, event_type, payload)
         VALUES ($1, $2, $3)`,
        [businessId || null, "wa_incoming", JSON.stringify(body)]
      );

      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;
        const value = change.value;

        // Handle incoming messages
        for (const msg of value.messages || []) {
          if (msg.type === "text" && businessId) {
            await pool.query(
              `INSERT INTO messages (business_id, direction, from_addr, to_addr, body, wa_message_id, status)
               VALUES ($1,'incoming',$2,'business',$3,$4,'delivered')
               ON CONFLICT DO NOTHING`,
              [businessId, msg.from, msg.text?.body || "", msg.id]
            );
          }
        }

        // Handle delivery/read receipts
        for (const status of value.statuses || []) {
          if (businessId) {
            await pool.query(
              "UPDATE messages SET status=$1 WHERE wa_message_id=$2 AND business_id=$3",
              [status.status, status.id, businessId]
            );
          }
        }
      }
    }
  } catch (err: any) {
    console.error("Webhook processing error:", err.message);
  }
});

export default router;
