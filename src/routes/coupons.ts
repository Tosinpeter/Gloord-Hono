import { Hono } from "hono";
import { db } from "../db/index.js";
import { coupons, type Coupon } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const couponRoute = new Hono();

type ValidateBody = {
  code: string;
  subtotal_cents?: number;
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function computeDiscount(coupon: Coupon, subtotalCents: number): number {
  if (coupon.min_order_cents != null && subtotalCents < coupon.min_order_cents) {
    return 0;
  }
  if (coupon.discount_type === "percent") {
    return Math.round((subtotalCents * coupon.discount_value) / 100);
  }
  return Math.min(coupon.discount_value, subtotalCents);
}

// POST /api/coupons/validate - validate a coupon and return discount amount
couponRoute.post("/validate", async (c) => {
  let body: ValidateBody;
  try {
    body = await c.req.json<ValidateBody>();
  } catch {
    return c.json({ success: false, error: "invalid_request_body" }, 400);
  }

  const code = normalizeCode(body.code ?? "");
  if (!code) {
    return c.json(
      { success: false, error: "invalid_code", message: "Coupon code is required" },
      400
    );
  }

  const subtotalCents = body.subtotal_cents ?? 0;

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code))
    .limit(1);

  if (!coupon) {
    return c.json({
      success: false,
      valid: false,
      error: "invalid_code",
      message: "This coupon code is not valid.",
    });
  }

  const now = new Date();
  if (coupon.valid_from && now < coupon.valid_from) {
    return c.json({
      success: false,
      valid: false,
      error: "not_yet_valid",
      message: "This coupon is not yet valid.",
    });
  }
  if (coupon.valid_until && now > coupon.valid_until) {
    return c.json({
      success: false,
      valid: false,
      error: "expired",
      message: "This coupon has expired.",
    });
  }

  if (
    coupon.usage_limit != null &&
    (coupon.used_count ?? 0) >= coupon.usage_limit
  ) {
    return c.json({
      success: false,
      valid: false,
      error: "usage_limit_reached",
      message: "This coupon has reached its usage limit.",
    });
  }

  if (coupon.min_order_cents != null && subtotalCents < coupon.min_order_cents) {
    const minOrder = (coupon.min_order_cents / 100).toFixed(2);
    return c.json({
      success: false,
      valid: false,
      error: "min_order_not_met",
      message: `Minimum order of $${minOrder} required for this coupon.`,
    });
  }

  const discount_cents = computeDiscount(coupon, subtotalCents);

  return c.json({
    success: true,
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
    },
    discount_cents,
    message:
      coupon.discount_type === "percent"
        ? `${coupon.discount_value}% off applied.`
        : `$${(coupon.discount_value / 100).toFixed(2)} off applied.`,
  });
});
