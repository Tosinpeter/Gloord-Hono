import { Hono } from "hono";
import { db } from "../db/index.js";
import { users, profile } from "../db/schema.js";
import { eq } from "drizzle-orm";
const DEMO_OTP_CODE = "123456";
export const auth = new Hono();
// POST /api/auth/register
auth.post("/request-otp", async (c) => {
    try {
        const body = await c.req.json();
        const { phone_number } = body;
        if (!phone_number) {
            return c.json({ success: false, error_code: "phone_required" }, 400);
        }
        // Simulate delay (e.g. SMS send time)
        await new Promise((resolve) => setTimeout(resolve, 500));
        return c.json({
            success: true,
            message: "Otp code sent successfuly",
        }, 201);
    }
    catch {
        return c.json({ success: false, error: "invalid_request_body" }, 400);
    }
});
// POST /api/auth/verify-otp
auth.post("/verify-otp", async (c) => {
    try {
        const body = await c.req.json();
        const { phone_number, code } = body;
        if (!phone_number || !code) {
            return c.json({ success: false, error: "phone_and_code_required" }, 400);
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (code !== DEMO_OTP_CODE) {
            return c.json({ success: false, error: "invalid_or_expired_code" }, 401);
        }
        let [user] = await db
            .select()
            .from(users)
            .where(eq(users.phone_number, phone_number))
            .limit(1);
        let userProfile = null;
        if (!user) {
            [user] = await db.insert(users).values({ phone_number }).returning();
            const [inserted] = await db
                .insert(profile)
                .values({ id: user.id })
                .returning();
            userProfile = inserted ?? null;
        }
        else {
            const [existing] = await db
                .select()
                .from(profile)
                .where(eq(profile.id, user.id))
                .limit(1);
            userProfile = existing ?? null;
        }
        // TODO: issue real token (e.g. JWT)
        return c.json({
            success: true,
            message: "Verification successful",
            data: {
                id: user.id,
                phone_number: user.phone_number,
                createdAt: user.createdAt,
                ...(userProfile && {
                    fullname: userProfile.fullname,
                    age: userProfile.age,
                    gender: userProfile.gender,
                    skin_type: userProfile.skin_type,
                    skin_sensitivity: userProfile.skin_sensitivity,
                    skin_concerns: userProfile.skin_concerns,
                    health_conditions: userProfile.health_conditions,
                }),
            },
            token: "placeholder-token",
        });
    }
    catch {
        return c.json({ success: false, error: "invalid_request_body" }, 400);
    }
});
// GET /api/auth/me - current user (requires auth middleware later)
auth.get("/me", (c) => {
    // TODO: verify token from header and return user
    return c.json({
        success: true,
        user: null,
    });
});
