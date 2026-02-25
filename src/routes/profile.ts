import { Hono } from "hono";
import { db } from "../db/index.js";
import { profile, type Profile, genderEnum, type Gender } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const profileRoute = new Hono();

type ProfileUpdateBody = {
  fullname?: string;
  age?: string;
  gender?: Gender;
  skin_type?: string;
  skin_sensitivity?: string;
  skin_concerns?: string[];
  health_conditions?: string;
};

// GET /api/profile/:id - get user profile by id
profileRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json({ success: false, error: "profile_id_required" }, 400);
  }

  const [userProfile] = await db
    .select()
    .from(profile)
    .where(eq(profile.id, id))
    .limit(1);

  if (!userProfile) {
    return c.json({ success: false, error: "profile_not_found" }, 404);
  }

  return c.json({
    success: true,
    data: userProfile as Profile,
  });
});

// PATCH /api/profile/:id - update user profile by id
profileRoute.patch("/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) {
    return c.json({ success: false, error: "profile_id_required" }, 400);
  }

  let body: ProfileUpdateBody;
  try {
    body = await c.req.json<ProfileUpdateBody>();
  } catch {
    return c.json({ success: false, error: "invalid_request_body" }, 400);
  }

  const [existing] = await db
    .select()
    .from(profile)
    .where(eq(profile.id, id))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: "profile_not_found" }, 404);
  }

  if (body.gender !== undefined && !genderEnum.includes(body.gender)) {
    return c.json({ success: false, error: "invalid_gender" }, 400);
  }

  const updates: Partial<Profile> = {};
  if (body.fullname !== undefined) updates.fullname = body.fullname;
  if (body.age !== undefined) updates.age = body.age;
  if (body.gender !== undefined) updates.gender = body.gender;
  if (body.skin_type !== undefined) updates.skin_type = body.skin_type;
  if (body.skin_sensitivity !== undefined)
    updates.skin_sensitivity = body.skin_sensitivity;
  if (body.skin_concerns !== undefined) updates.skin_concerns = body.skin_concerns;
  if (body.health_conditions !== undefined)
    updates.health_conditions = body.health_conditions;

  const [updated] = await db
    .update(profile)
    .set(updates)
    .where(eq(profile.id, id))
    .returning();

  return c.json({
    success: true,
    data: updated as Profile,
  });
});
