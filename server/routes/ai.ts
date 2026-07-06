import { Router } from "express";
import pool from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { generateTemplateAI } from "../services/gemini.js";
import { geminiLive } from "../services/gemini.js";

const router = Router();

// GET /api/ai/status
router.get("/status", requireAuth, (req, res) => {
  res.json({ geminiLive });
});

// POST /api/ai/generate-template
router.post("/generate-template", requireAuth, async (req, res) => {
  const { prompt, businessType, category } = req.body;

  if (!prompt) {
    res.status(400).json({ error: "Prompt is required" });
    return;
  }

  try {
    const result = await generateTemplateAI(
      prompt,
      businessType || "general business",
      category || "MARKETING"
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error("AI template generation error:", err);
    res.status(500).json({ error: err.message || "AI generation failed" });
  }
});

export default router;
