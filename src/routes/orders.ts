import { Hono } from "hono";
import { db } from "../db/index.js";
import { orders } from "../db/schema.js";

export const ordersRoute = new Hono();

type CreateOrderBody = {
  delivery_first_name: string;
  delivery_email: string;
  delivery_address: string;
  delivery_apartment?: string;
  delivery_city: string;
  delivery_postal_code: string;
  delivery_phone?: string;
  delivery_country: string;
  subtotal_cents: number;
  shipment_cents: number;
  insurance_cents: number;
  discount_cents?: number;
  total_cents: number;
  card_last4: string;
  coupon_code?: string;
};

ordersRoute.post("/", async (c) => {
  let body: CreateOrderBody;
  try {
    body = await c.req.json<CreateOrderBody>();
  } catch {
    return c.json({ success: false, error: "invalid_request_body" }, 400);
  }

  const {
    delivery_first_name,
    delivery_email,
    delivery_address,
    delivery_city,
    delivery_postal_code,
    delivery_country,
    subtotal_cents,
    shipment_cents,
    insurance_cents,
    total_cents,
    card_last4,
  } = body;

  if (
    !delivery_first_name ||
    !delivery_email ||
    !delivery_address ||
    !delivery_city ||
    !delivery_postal_code ||
    !delivery_country ||
    typeof subtotal_cents !== "number" ||
    typeof shipment_cents !== "number" ||
    typeof insurance_cents !== "number" ||
    typeof total_cents !== "number" ||
    !card_last4
  ) {
    return c.json(
      { success: false, error: "missing_required_fields", message: "Missing required order fields" },
      400
    );
  }

  const [order] = await db
    .insert(orders)
    .values({
      delivery_first_name,
      delivery_email,
      delivery_address,
      delivery_apartment: body.delivery_apartment ?? null,
      delivery_city,
      delivery_postal_code,
      delivery_phone: body.delivery_phone ?? null,
      delivery_country,
      subtotal_cents,
      shipment_cents,
      insurance_cents,
      discount_cents: body.discount_cents ?? 0,
      total_cents,
      card_last4,
      coupon_code: body.coupon_code ?? null,
    })
    .returning();

  return c.json({ success: true, order: { id: order.id, status: order.status, total_cents: order.total_cents } });
});
