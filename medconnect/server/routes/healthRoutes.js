import express from "express";
import { getPool } from "../helpers/db.mssql.js";
import { ok } from "../utils/response.js";

const router = express.Router();

// Health check route
router.get("/healthz", (_req, res) => ok(res, { ping: "pong" }));

// Database check route
router.get("/db-check", async (_req, res) => {
  try {
    const pool = await getPool();
    const rs = await pool.request().query("SELECT GETDATE() AS now");
    return res.json({ ok: true, now: rs.recordset[0].now });
  } catch (e) {
    console.error("❌ /db-check error:", e);
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

export default router;
