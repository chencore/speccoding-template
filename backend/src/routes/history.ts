import { Hono } from "hono";
import { listAdoptedTopicsWithCopies } from "../persistence/history.js";

export const historyRouter = new Hono();

historyRouter.get("/history", (c) => {
  const items = listAdoptedTopicsWithCopies();
  return c.json({ items });
});
