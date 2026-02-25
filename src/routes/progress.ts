import { Hono } from "hono";

export const progressRoute = new Hono();

/**
 * Mock progress data - same shape as the app expects.
 * Replace with DB-backed data when progress tables exist.
 */
const defaultProgressData = {
  isUnlocked: true,
  daysUntilUnlock: 12,
  lastUpdated: new Date().toISOString(),
  metrics: {
    skinScore: {
      title: "Skin Score",
      value: "85",
      trend: { value: "+5%", direction: "up" as const },
    },
    skinAge: {
      title: "Skin Age",
      value: "25",
      unit: "years old",
      trend: { value: "-2%", direction: "down" as const },
    },
    hydration: {
      title: "Hydration",
      value: "85",
      trend: { value: "+10%", direction: "up" as const },
    },
    acne: {
      title: "Acne",
      value: "90",
      trend: { value: "-5%", direction: "down" as const },
    },
    texture: {
      title: "Texture",
      value: "90",
      trend: { value: "+5%", direction: "up" as const },
    },
    wrinkles: {
      title: "Wrinkles",
      value: "85",
      trend: { value: "-5%", direction: "down" as const },
    },
    darkSpots: {
      title: "Dark Spots",
      value: "85",
      trend: { value: "+7%", direction: "up" as const },
    },
    poreSize: {
      title: "Pore Size",
      value: "78",
      trend: { value: "-3%", direction: "down" as const },
    },
  },
  routineConsistency: {
    currentStreak: 7,
    longestStreak: 14,
    completionRate: 85,
    weeklyData: [
      { day: "Mon", completed: true },
      { day: "Tue", completed: true },
      { day: "Wed", completed: true },
      { day: "Thu", completed: false },
      { day: "Fri", completed: true },
      { day: "Sat", completed: true },
      { day: "Sun", completed: true },
    ],
  },
};

/**
 * GET /api/progress/:userId
 * Returns progress data for the user.
 */
progressRoute.get("/:userId", async (c) => {
  const userId = c.req.param("userId");
  if (!userId) {
    return c.json({ success: false, error: "user_id_required" }, 400);
  }

  return c.json({
    success: true,
    data: {
      userId,
      ...defaultProgressData,
    },
  });
});
