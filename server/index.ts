import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

import { migrate } from "./db/migrate.js";

// Routes
import authRoutes from "./routes/auth.js";
import businessRoutes from "./routes/businesses.js";
import customerRoutes from "./routes/customers.js";
import serviceRoutes from "./routes/services.js";
import bookingRoutes from "./routes/bookings.js";
import ledgerRoutes from "./routes/ledger.js";
import templateRoutes from "./routes/templates.js";
import campaignRoutes from "./routes/campaigns.js";
import sandboxRoutes from "./routes/sandbox.js";
import aiRoutes from "./routes/ai.js";
import webhookRoutes from "./routes/webhook.js";
import publicRoutes from "./routes/public.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === "production" ? false : true,
  credentials: true,
}));

// Webhook needs raw body for signature verification
app.use("/api/webhook", express.raw({ type: "application/json" }), (req, _res, next) => {
  if (req.body instanceof Buffer) {
    try { req.body = JSON.parse(req.body.toString()); } catch { req.body = {}; }
  }
  next();
});

app.use(express.json());

// ─── API Routes ───────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/sandbox", sandboxRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api/public", publicRoutes);

// Health check
app.get("/api/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// ─── Start Server ─────────────────────────────────────────────
async function startServer() {
  // Run database migrations first
  try {
    await migrate();
  } catch (err: any) {
    console.error("❌ Could not connect to database. Please check DATABASE_URL in .env");
    console.error("   Error:", err.message);
    process.exit(1);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("⚡ Vite dev middleware mounted.");
  } else {
    const distPath = path.join(__dirname, "../../dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log(`📁 Serving static from ${distPath}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Whatapply server running at http://localhost:${PORT}`);
    console.log(`   Mode: ${process.env.NODE_ENV || "development"}`);
  });
}

startServer();
