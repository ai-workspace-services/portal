"use client";

type StripeCheckoutPayload = {
  planId: string;
  stripePriceId: string;
  amountMinor?: number;
  currency?: "CNY" | "USD";
  mode: "payment" | "subscription";
  productSlug: string;
  sourcePath?: string;
};

type StripePortalPayload = {
  returnPath?: string;
};

function buildLoginUrl(): string {
  if (typeof window === "undefined") {
    return "/login";
  }
  const redirect = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return `/login?redirect=${encodeURIComponent(redirect)}`;
}

async function postJson<TResponse>(
  url: string,
  payload: Record<string, unknown>,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    window.location.href = buildLoginUrl();
    throw new Error("authentication_required");
  }

  const data = (await response.json().catch(() => ({}))) as TResponse & {
    error?: string;
    message?: string;
  };
  if (!response.ok) {
    throw new Error(data.message || data.error || "request_failed");
  }
  return data;
}

export async function startStripeCheckout(
  payload: StripeCheckoutPayload,
): Promise<void> {
  const data = await postJson<{ url?: string }>(
    "/api/auth/stripe/checkout",
    payload,
  );
  if (!data.url) {
    throw new Error("stripe_checkout_url_missing");
  }
  window.location.href = data.url;
}

export async function openStripePortal(
  payload: StripePortalPayload = {},
): Promise<void> {
  const data = await postJson<{ url?: string }>(
    "/api/auth/stripe/portal",
    payload,
  );
  if (!data.url) {
    throw new Error("stripe_portal_url_missing");
  }
  window.location.href = data.url;
}
