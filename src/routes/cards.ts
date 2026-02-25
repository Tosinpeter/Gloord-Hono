import { Hono } from "hono";
import { db } from "../db/index.js";
import { savedCards, type SavedCard } from "../db/schema.js";
import { eq } from "drizzle-orm";

export const cardsRoute = new Hono();

/** Normalize card number: digits only */
function normalizeNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Validate card: 16 digits only */
export function validateMastercard(number: string): { valid: boolean; last4?: string; error?: string } {
  const num = normalizeNumber(number);
  if (num.length !== 16) {
    return { valid: false, error: "Card number must be 16 digits" };
  }
  return { valid: true, last4: num.slice(-4) };
}

/** Sample test cards: last4 4444 = success, last4 0009 = failed payment (for charge simulation). */
export const SAMPLE_SUCCESS_LAST4 = "4444";
export const SAMPLE_FAIL_LAST4 = "0009";

/** GET /api/cards - list saved cards */
cardsRoute.get("/", async (c) => {
  const list = await db.select().from(savedCards).orderBy(savedCards.createdAt);
  return c.json({ success: true, cards: list });
});

type AddCardBody = {
  number: string;
  exp_month: number;
  exp_year: number;
  save?: boolean;
  set_default?: boolean;
};

/** POST /api/cards - add card (validate Mastercard, optionally save) */
cardsRoute.post("/", async (c) => {
  let body: AddCardBody;
  try {
    body = await c.req.json<AddCardBody>();
  } catch {
    return c.json({ success: false, error: "invalid_request_body" }, 400);
  }

  const num = normalizeNumber(body.number ?? "");
  if (num.length !== 16) {
    return c.json(
      { success: false, error: "invalid_number", message: "Card number must be 16 digits" },
      400
    );
  }

  const validation = validateMastercard(body.number!);
  if (!validation.valid) {
    return c.json(
      { success: false, error: "invalid_card", message: validation.error },
      400
    );
  }

  const exp_month = Number(body.exp_month);
  const exp_year = Number(body.exp_year);
  if (!Number.isInteger(exp_month) || exp_month < 1 || exp_month > 12) {
    return c.json(
      { success: false, error: "invalid_expiry", message: "Invalid expiry month" },
      400
    );
  }
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (exp_year < currentYear || (exp_year === currentYear && exp_month < currentMonth)) {
    return c.json(
      { success: false, error: "expired", message: "Card has expired" },
      400
    );
  }

  const last4 = validation.last4!;
  const save = body.save === true;
  const setDefault = body.set_default === true;

  if (save) {
    if (setDefault) {
      await db.update(savedCards).set({ is_default: false });
    }
    const [inserted] = await db
      .insert(savedCards)
      .values({
        last4,
        brand: "mastercard",
        exp_month,
        exp_year,
        is_default: setDefault,
      })
      .returning();
    return c.json({
      success: true,
      card: mapCard(inserted),
      saved: true,
      message: "Card saved.",
    });
  }

  return c.json({
    success: true,
    card: { last4, brand: "mastercard", id: null },
    saved: false,
  });
});

/** PATCH /api/cards/:id/default - set card as default */
cardsRoute.patch("/:id/default", async (c) => {
  const id = c.req.param("id");
  await db.update(savedCards).set({ is_default: false });
  const [updated] = await db
    .update(savedCards)
    .set({ is_default: true })
    .where(eq(savedCards.id, id))
    .returning();
  if (!updated) {
    return c.json({ success: false, error: "card_not_found" }, 404);
  }
  return c.json({ success: true, card: mapCard(updated) });
});

type ChargeBody = {
  card_id?: string;
  number?: string;
  exp_month?: number;
  exp_year?: number;
  amount_cents: number;
};

/** POST /api/cards/charge - simulate payment (success/fail by sample card) */
cardsRoute.post("/charge", async (c) => {
  let body: ChargeBody;
  try {
    body = await c.req.json<ChargeBody>();
  } catch {
    return c.json({ success: false, error: "invalid_request_body" }, 400);
  }

  const amount_cents = Number(body.amount_cents);
  if (!Number.isInteger(amount_cents) || amount_cents <= 0) {
    return c.json(
      { success: false, error: "invalid_amount", message: "Invalid amount" },
      400
    );
  }

  let last4: string;

  if (body.card_id) {
    const [card] = await db.select().from(savedCards).where(eq(savedCards.id, body.card_id)).limit(1);
    if (!card) {
      return c.json({ success: false, error: "card_not_found" }, 404);
    }
    last4 = card.last4;
  } else if (body.number) {
    const num = normalizeNumber(body.number);
    if (num.length !== 16) {
      return c.json(
        { success: false, error: "invalid_number", message: "Card number must be 16 digits" },
        400
      );
    }
    const validation = validateMastercard(body.number);
    if (!validation.valid) {
      return c.json(
        { success: false, error: "invalid_card", message: validation.error },
        400
      );
    }
    last4 = validation.last4!;
  } else {
    return c.json(
      { success: false, error: "missing_card", message: "Provide card_id or number" },
      400
    );
  }

  // Sample cards: last4 4444 = success, last4 0009 = failed payment
  const success = last4 === SAMPLE_SUCCESS_LAST4;
  if (success) {
    return c.json({
      success: true,
      paid: true,
      amount_cents,
      message: "Payment successful.",
    });
  }
  if (last4 === SAMPLE_FAIL_LAST4) {
    return c.json(
      {
        success: false,
        paid: false,
        error: "payment_declined",
        message: "Your card was declined. Please try another card.",
      },
      402
    );
  }

  // Any other valid Mastercard: treat as success for demo
  return c.json({
    success: true,
    paid: true,
    amount_cents,
    message: "Payment successful.",
  });
});

function mapCard(row: SavedCard) {
  return {
    id: row.id,
    last4: row.last4,
    brand: row.brand,
    exp_month: row.exp_month,
    exp_year: row.exp_year,
    is_default: row.is_default,
    created_at: row.createdAt,
  };
}
