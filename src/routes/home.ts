import { Hono } from "hono";
import { db } from "../db/index.js";
import { profile, notifications } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export const homeRoute = new Hono();

const defaultTreatmentPlan = {
  current: 1,
  total: 4,
  title: "Your Skin Routine",
  subtitle: "Treatment Plan",
};

/**
 * GET /api/home/:userId
 * Returns home page data: user name from profile, treatment plan, notification badge, isUnlocked.
 */
homeRoute.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  if (!userId) {
    return c.json({ success: false, error: "user_id_required" }, 400);
  }

  try {
    const [userProfile] = await db
      .select()
      .from(profile)
      .where(eq(profile.id, userId))
      .limit(1);

    const userName = userProfile?.fullname ?? "";

    let hasNotifications = false;
    try {
      const unread = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(and(eq(notifications.user_id, userId), eq(notifications.is_read, false)))
        .limit(1);
      hasNotifications = unread.length > 0;
    } catch {
      // Notifications table may not exist yet; treat as no unread
    }

    return c.json({
      success: true,
      data: {
        userId,
        userName,
        isUnlocked: false,
        treatmentPlan: defaultTreatmentPlan,
        hasNotifications,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("Home route error:", err);
    return c.json(
      {
        success: false,
        error: "internal_error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      500
    );
  }
});
