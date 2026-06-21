import { Hono } from "hono";
import { getDashboardStats } from "../dashboard/repo.js";

export const dashboardRouter = new Hono();

dashboardRouter.get("/dashboard/stats", (c) => {
  const stats = getDashboardStats();
  return c.json(stats);
});
