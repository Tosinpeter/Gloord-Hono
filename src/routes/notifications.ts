import { Hono } from "hono";
import { db } from "../db/index.js";
import { notifications, users } from "../db/schema.js";
import { eq, desc, and } from "drizzle-orm";

export const notificationsRoute = new Hono();

notificationsRoute.get("/", async (c) => {
  const user_id = c.req.query("user_id");
  if (!user_id) {
    return c.json({ success: false, error: "user_id_required" }, 400);
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.user_id, user_id))
    .orderBy(desc(notifications.createdAt));

  return c.json({ success: true, notifications: rows });
});

type CreateNotificationBody = {
  user_id: string;
  title: string;
  subtitle: string;
  notification_type: "prescription_ready" | "review_completed" | "night_routine" | "order_shipped";
};

notificationsRoute.post("/", async (c) => {
  let body: CreateNotificationBody;
  try {
    body = await c.req.json<CreateNotificationBody>();
  } catch {
    return c.json({ success: false, error: "invalid_request_body" }, 400);
  }

  const { user_id, title, subtitle, notification_type } = body;
  if (!user_id || !title || !subtitle || !notification_type) {
    return c.json({ success: false, error: "missing_required_fields" }, 400);
  }

  const [row] = await db
    .insert(notifications)
    .values({ user_id, title, subtitle, notification_type })
    .returning();

  return c.json({ success: true, notification: row });
});

notificationsRoute.patch("/:id/read", async (c) => {
  const id = c.req.param("id");

  const [updated] = await db
    .update(notifications)
    .set({ is_read: true })
    .where(eq(notifications.id, id))
    .returning();

  if (!updated) {
    return c.json({ success: false, error: "notification_not_found" }, 404);
  }

  return c.json({ success: true, notification: updated });
});

notificationsRoute.patch("/read-all", async (c) => {
  const user_id = c.req.query("user_id");
  if (!user_id) {
    return c.json({ success: false, error: "user_id_required" }, 400);
  }

  await db
    .update(notifications)
    .set({ is_read: true })
    .where(eq(notifications.user_id, user_id));

  return c.json({ success: true });
});

notificationsRoute.post("/seed", async (c) => {
  let body: { user_id: string };
  try {
    body = await c.req.json<{ user_id: string }>();
  } catch {
    return c.json({ success: false, error: "invalid_request_body" }, 400);
  }

  const { user_id } = body;
  if (!user_id) {
    return c.json({ success: false, error: "user_id_required" }, 400);
  }

  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const seeds = [
    { user_id, title: "Your Prescription is Ready", subtitle: "Download and consult a local pharmacy", notification_type: "prescription_ready" as const, createdAt: now },
    { user_id, title: "Doctor review completed", subtitle: "Your treatment plan is approved", notification_type: "review_completed" as const, createdAt: hourAgo },
    { user_id, title: "Time for your night routine", subtitle: "Consistency helps your skin heal faster", notification_type: "night_routine" as const, is_read: true, createdAt: yesterday },
    { user_id, title: "Your order has been shipped", subtitle: "Track your delivery", notification_type: "order_shipped" as const, is_read: true, createdAt: twoDaysAgo },
  ];

  const rows = await db.insert(notifications).values(seeds).returning();
  return c.json({ success: true, count: rows.length });
});
