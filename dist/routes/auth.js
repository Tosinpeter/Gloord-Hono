import { Hono } from "hono";
import { db } from "../db/index.js";
import { users, profile, staff } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { verifyPassword } from "../lib/password.js";
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
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ success: false, error: "invalid_request_body" }, 400);
    }
    const { phone_number, code } = body;
    if (!phone_number || !code) {
        return c.json({ success: false, error: "phone_and_code_required" }, 400);
    }
    if (code !== DEMO_OTP_CODE) {
        return c.json({ success: false, error: "invalid_or_expired_code" }, 401);
    }
    try {
        const result = db.transaction((tx) => {
            let [user] = tx
                .select()
                .from(users)
                .where(eq(users.phone_number, phone_number))
                .limit(1)
                .all();
            let userProfile = null;
            if (!user) {
                [user] = tx.insert(users).values({ phone_number }).returning().all();
                [userProfile] = tx
                    .insert(profile)
                    .values({ id: user.id })
                    .returning()
                    .all();
            }
            else {
                [userProfile] = tx
                    .select()
                    .from(profile)
                    .where(eq(profile.id, user.id))
                    .limit(1)
                    .all();
                if (!userProfile) {
                    [userProfile] = tx
                        .insert(profile)
                        .values({ id: user.id })
                        .returning()
                        .all();
                }
            }
            return { user, userProfile: userProfile ?? null };
        });
        const { user, userProfile } = result;
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
    catch (err) {
        console.error("[verify-otp] DB error:", err);
        return c.json({ success: false, error: "internal_server_error" }, 500);
    }
});
// POST /api/auth/staff-login - for gloord (admin/doctor email + password)
auth.post("/staff-login", async (c) => {
    let body;
    try {
        body = await c.req.json();
    }
    catch {
        return c.json({ success: false, error: "invalid_request_body" }, 400);
    }
    const { email, password, role } = body;
    if (!email || !password || !role) {
        return c.json({ success: false, error: "email_password_and_role_required" }, 400);
    }
    if (role !== "admin" && role !== "doctor") {
        return c.json({ success: false, error: "invalid_role" }, 400);
    }
    try {
        const [staffUser] = db
            .select()
            .from(staff)
            .where(and(eq(staff.email, email.toLowerCase().trim()), eq(staff.role, role)))
            .limit(1)
            .all();
        if (!staffUser || !verifyPassword(password, staffUser.password_hash)) {
            return c.json({ success: false, error: "invalid_credentials" }, 401);
        }
        // TODO: issue real token (e.g. JWT)
        return c.json({
            success: true,
            message: "Login successful",
            data: {
                id: staffUser.id,
                email: staffUser.email,
                role: staffUser.role,
                createdAt: staffUser.createdAt,
            },
            token: `staff-${staffUser.id}-placeholder`,
        });
    }
    catch (err) {
        console.error("[staff-login] DB error:", err);
        return c.json({ success: false, error: "internal_server_error" }, 500);
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
