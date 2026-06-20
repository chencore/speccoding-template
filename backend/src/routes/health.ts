import { Hono } from "hono";
import { db } from "../db/index.js";

export const health = new Hono();

health.get("/health", (c) => {
  let dbStatus = "connected";
  try {
    db.prepare("SELECT 1").get();
  } catch {
    dbStatus = "error";
  }
  return c.json({
    status: "ok",
    db: dbStatus,
    uptime: process.uptime(),
  });
});
