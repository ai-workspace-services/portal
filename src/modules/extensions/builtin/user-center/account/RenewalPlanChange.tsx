"use client";
import { useEffect, useState } from "react";
import { useBillingCatalog } from "@modules/billing/catalog";

type Quote = {
  planId: string;
  amountDue: number;
  renewalAmount: number;
  currency: string;
  effectiveAt: number;
  previewToken: string;
};
type Status = {
  status: "none" | "scheduled" | "applied";
  planId?: string;
  effectiveAt?: number;
};
const BASE = "/api/auth/stripe/subscription/renewal";
async function request<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message || data.error || "无法读取续费变更");
  return data;
}
export default function RenewalPlanChange() {
  const catalog = useBillingCatalog();
  const [planId, setPlanId] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    request<Status>(BASE)
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function submit(confirm: boolean) {
    setBusy(true);
    setError("");
    try {
      if (confirm && quote) {
        await request(BASE, { previewToken: quote.previewToken });
        setQuote(null);
        setStatus(await request<Status>(BASE));
      } else setQuote(await request<Quote>(`${BASE}/preview`, { planId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "续费变更失败");
    } finally {
      setBusy(false);
    }
  }
  const plans = [...catalog.values()].filter(
    (p) =>
      p.active &&
      p.kind === "subscription" &&
      p.stripePriceId &&
      (p.priceAmount ?? 0) > 0,
  );
  return (
    <section
      className="mt-5 space-y-3 rounded-lg border p-4"
      aria-label="下次续费切换套餐"
    >
      <h3 className="font-semibold">下次续费切换套餐</h3>
      <p className="text-sm">
        当前已付费周期保留原价和权益，新价格从下次续费生效。
      </p>
      {status?.status === "scheduled" ? (
        <p role="status">
          已安排切换至{" "}
          {catalog.get(status.planId || "")?.displayName || status.planId}
          ，生效日期{" "}
          {status.effectiveAt
            ? new Date(status.effectiveAt * 1000).toLocaleDateString()
            : "待核对"}
          。
        </p>
      ) : (
        <>
          <label>
            目标套餐
            <select
              aria-label="续费目标套餐"
              value={planId}
              disabled={busy || !!quote}
              onChange={(e) => {
                setPlanId(e.target.value);
                setQuote(null);
              }}
            >
              <option value="">选择套餐</option>
              {plans.map((p) => (
                <option key={p.planId} value={p.planId}>
                  {p.displayName} ·{" "}
                  {new Intl.NumberFormat("zh-CN", {
                    style: "currency",
                    currency: p.priceCurrency || "CNY",
                  }).format((p.priceAmount || 0) / 100)}{" "}
                  / {p.priceUnit}
                </option>
              ))}
            </select>
          </label>
          {quote ? (
            <div>
              <p>
                本次应付 0。续费金额{" "}
                {new Intl.NumberFormat("zh-CN", {
                  style: "currency",
                  currency: quote.currency,
                }).format(quote.renewalAmount / 100)}
                ，生效日期{" "}
                {new Date(quote.effectiveAt * 1000).toLocaleDateString()}。
              </p>
              <button disabled={busy} onClick={() => void submit(true)}>
                确认下次续费切换
              </button>
              <button disabled={busy} onClick={() => setQuote(null)}>
                返回修改
              </button>
            </div>
          ) : (
            <button
              disabled={busy || !planId || !status}
              onClick={() => void submit(false)}
            >
              预览续费变更
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
