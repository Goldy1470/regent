import "server-only";

export const DODO_BASE = () =>
  process.env.DODO_MODE === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";

export const dodoConfigured = () => Boolean(process.env.DODO_API_KEY);

export type CheckoutPeriod = "monthly" | "annual";

export function planProductId(plan: string, period: CheckoutPeriod = "monthly") {
  if (period === "annual") {
    return plan === "growth"
      ? process.env.DODO_PRODUCT_GROWTH_ANNUAL
      : process.env.DODO_PRODUCT_STARTER_ANNUAL;
  }
  switch (plan) {
    case "growth":
      return process.env.DODO_PRODUCT_GROWTH;
    case "starter":
      return process.env.DODO_PRODUCT_STARTER;
    default:
      return undefined;
  }
}

export function planFromProductId(productId: string | undefined | null) {
  if (!productId) return null;
  if (productId === process.env.DODO_PRODUCT_GROWTH) return "growth" as const;
  if (productId === process.env.DODO_PRODUCT_STARTER) return "starter" as const;
  if (productId === process.env.DODO_PRODUCT_GROWTH_ANNUAL) return "growth" as const;
  if (productId === process.env.DODO_PRODUCT_STARTER_ANNUAL) return "starter" as const;
  return null;
}

export function periodFromProductId(productId: string | undefined | null): CheckoutPeriod | null {
  if (!productId) return null;
  if (
    productId === process.env.DODO_PRODUCT_STARTER_ANNUAL ||
    productId === process.env.DODO_PRODUCT_GROWTH_ANNUAL
  ) {
    return "annual";
  }
  if (productId === process.env.DODO_PRODUCT_STARTER || productId === process.env.DODO_PRODUCT_GROWTH) {
    return "monthly";
  }
  return null;
}

export async function createDodoCheckout(args: {
  plan: string;
  period?: CheckoutPeriod;
  email: string;
  name: string;
  userId: string;
  origin: string;
}): Promise<{ url?: string; error?: string }> {
  if (!dodoConfigured()) {
    return {
      error:
        "Dodo Payments is not configured. Set DODO_MODE + DODO_API_KEY (and product IDs) in .env.local — see .env.example.",
    };
  }

  const period = args.period ?? "monthly";
  const productId = planProductId(args.plan, period);
  if (!productId) {
    return {
      error:
        `No Dodo product mapped for plan "${args.plan}" (${period}). Create it in the Dodo dashboard and add the DODO_PRODUCT_* env var.`,
    };
  }

  const res = await fetch(`${DODO_BASE()}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DODO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: productId, quantity: 1 }],
      return_url: `${args.origin}/app/billing/success`,
      metadata: {
        user_id: args.userId,
        plan: args.plan,
        period,
      },
      customer: {
        email: args.email,
        name: args.name,
      },
      branding: {
        business_name: "Regent",
        logo: `${args.origin}/shield-icon.svg`,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Dodo checkout failed: ${res.status} ${text.slice(0, 200)}` };
  }

  const json = (await res.json()) as { checkout_url?: string };
  if (!json.checkout_url) return { error: "Dodo returned no checkout_url." };
  return { url: json.checkout_url };
}

/** Dodo hosted customer portal (subscription management, cards, cancel). */
export async function createDodoPortalSession(args: {
  customer_id: string;
  email: string;
  origin: string;
}): Promise<{ url?: string; error?: string }> {
  if (!dodoConfigured()) return { error: "Dodo Payments is not configured." };

  const res = await fetch(`${DODO_BASE()}/customers/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DODO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer_id: args.customer_id,
      email: args.email,
      return_url: `${args.origin}/app/billing`,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Dodo portal failed: ${res.status} ${text.slice(0, 200)}` };
  }
  const json = (await res.json()) as { link?: string; url?: string };
  const url = json.link ?? json.url;
  if (!url) return { error: "Dodo returned no portal link." };
  return { url };
}
