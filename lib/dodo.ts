export const DODO_BASE = () =>
  process.env.DODO_MODE === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";

export const dodoConfigured = () => Boolean(process.env.DODO_API_KEY);

export function planProductId(plan: string) {
  switch (plan) {
    case "scale":
      return process.env.DODO_PRODUCT_SCALE;
    case "pro":
      return process.env.DODO_PRODUCT_PRO;
    default:
      return process.env.DODO_PRODUCT_STARTER;
  }
}

export function planFromProductId(productId: string | undefined | null) {
  if (!productId) return null;
  if (productId === process.env.DODO_PRODUCT_SCALE) return "scale";
  if (productId === process.env.DODO_PRODUCT_PRO) return "pro";
  if (productId === process.env.DODO_PRODUCT_STARTER) return "starter";
  return null;
}

export async function createDodoCheckout(args: {
  plan: string;
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

  const productId = planProductId(args.plan);
  if (!productId) {
    return {
      error:
        `No Dodo product mapped for plan "${args.plan}". Create the product in the Dodo dashboard and add DODO_PRODUCT_${args.plan.toUpperCase()} to .env.local.`,
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
      },
      customer: {
        email: args.email,
        name: args.name,
      },
      branding: {
        business_name: "Revenue Shield AI",
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
