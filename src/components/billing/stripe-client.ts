"use client";

export type StripeCheckoutPayload = {
  planId: string;
  stripePriceId: string;
  amountMinor?: number;
  currency?: "CNY" | "USD";
  mode: "payment" | "subscription";
  productSlug: string;
  sourcePath?: string;
  previewToken?: string;
};

export type SubscriptionPreview = {
  action: "subscribe" | "upgrade";
  planId: string;
  amountDue: number;
  currency: string;
  renewalAmount: number;
  renewalAt: number;
  expiresAt: number;
  previewToken: string;
};

export async function previewSubscription(
  payload: StripeCheckoutPayload,
): Promise<SubscriptionPreview> {
  return postJson<SubscriptionPreview>(
    "/api/auth/stripe/subscription/preview",
    payload,
  );
}

export async function getSubscriptionPurchase(): Promise<{
  pending: boolean;
  planId?: string;
  url?: string;
  retryable?: boolean;
}> {
  const response = await fetch("/api/auth/stripe/subscription/pending", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("purchase_status_unavailable");
  const data = await response.json();
  if (typeof data.pending !== "boolean")
    throw new Error("purchase_status_invalid");
  if (data.url) {
    const url = new URL(data.url);
    if (
      url.protocol !== "https:" ||
      ![
        "checkout.stripe.com",
        "invoice.stripe.com",
        "billing.stripe.com",
      ].includes(url.hostname)
    )
      delete data.url;
  }
  return data;
}

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
  // Other entry points (including /prices) cannot bypass quote confirmation.
  if (payload.mode === "subscription" && !payload.previewToken) {
    const quote = await previewSubscription(payload);
    const money = (amount: number) =>
      new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: quote.currency,
      }).format(amount / 100);
    if (
      !window.confirm(
        `本次应付：${money(quote.amountDue)}\n生效时间：付款确认后\n下次续费日期：${quote.renewalAt ? new Date(quote.renewalAt * 1000).toLocaleDateString() : "付款确认后确定"}\n下次续费金额：${money(quote.renewalAmount)}`,
      )
    )
      return;
    payload = { ...payload, previewToken: quote.previewToken };
  }
  const data = await postJson<{ url?: string; pending?: boolean }>(
    "/api/auth/stripe/checkout",
    payload,
  );
  if (data.pending && !data.url) return;
  if (!data.url) {
    throw new Error("stripe_checkout_url_missing");
  }
  window.location.href = data.url;
}

export async function retrySubscriptionPurchase(): Promise<void> {
  const data = await postJson<{ url?: string }>(
    "/api/auth/stripe/subscription/retry",
    {},
  );
  if (data.url) window.location.href = data.url;
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
