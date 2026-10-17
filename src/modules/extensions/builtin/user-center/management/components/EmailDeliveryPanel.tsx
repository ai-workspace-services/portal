"use client";
import { useState } from "react";
import useSWR from "swr";
import { useLanguage } from "@i18n/LanguageProvider";
import { emailCopy, emailRequest } from "@/lib/email-preferences";

type Delivery = {
  id: string;
  userId: string;
  subject: string;
  status: string;
  attempts: number;
  lastError: string;
  dueAt: string;
  sentAt?: string;
};
export default function EmailDeliveryPanel({
  campaignId = "all",
}: {
  campaignId?: string;
}) {
  const { language } = useLanguage();
  const t = emailCopy(language);
  const { data, error, mutate } = useSWR<{
    stats: Record<string, number>;
    deliveries: Delivery[];
  }>(`/api/auth/admin/email-campaigns/${campaignId}/deliveries`, emailRequest, {
    refreshInterval: 10000,
  });
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [message, setMessage] = useState("");
  const [ack, setAck] = useState<Record<string, boolean>>({});
  function label(status: string) {
    if (status === "retry") return t.retryStatus;
    const value = (t as Record<string, unknown>)[status];
    return typeof value === "string" ? value : status;
  }
  async function process() {
    setBusy(true);
    setFailure("");
    try {
      const result = await emailRequest<{ processed: number }>(
        "/api/auth/admin/email-dispatch",
        { method: "POST", body: "{}" },
      );
      setMessage(`${t.processed}: ${result.processed}`);
      await mutate();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  async function retry(row: Delivery) {
    setBusy(true);
    setFailure("");
    try {
      await emailRequest(`/api/auth/admin/email-deliveries/${row.id}/retry`, {
        method: "POST",
        body: JSON.stringify({ acknowledgeUnknown: ack[row.id] === true }),
      });
      await mutate();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  async function confirmAccepted(row: Delivery) {
    setBusy(true);
    setFailure("");
    try {
      await emailRequest(
        `/api/auth/admin/email-deliveries/${row.id}/confirm-accepted`,
        {
          method: "POST",
          body: JSON.stringify({ confirmed: ack[row.id] === true }),
        },
      );
      await mutate();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t.deliveryTitle}</h2>
        <button
          className="min-h-11 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          type="button"
          disabled={busy}
          onClick={() => void process()}
        >
          {t.processQueue}
        </button>
      </div>
      <p className="text-sm text-[var(--color-text-muted)]">
        {t.unknownNotice}
      </p>
      {data && (
        <div className="flex flex-wrap gap-3 text-sm">
          {Object.entries(data.stats).map(([status, count]) => (
            <span key={status}>
              {label(status)}: {count}
            </span>
          ))}
        </div>
      )}
      {data?.deliveries.length === 0 && (
        <p className="text-sm">{t.noDeliveries}</p>
      )}
      <div className="space-y-3">
        {data?.deliveries.map((row) => (
          <article
            className="space-y-2 rounded-md border border-[color:var(--color-surface-border)] p-3 text-sm"
            key={row.id}
          >
            <div className="flex flex-wrap justify-between gap-2">
              <strong className="break-words">{row.subject}</strong>
              <span>
                {label(row.status)} · {t.attempts}: {row.attempts}
              </span>
            </div>
            <p className="break-all text-[var(--color-text-muted)]">
              {t.userId}: {row.userId}
            </p>
            {row.lastError && (
              <p>
                {t.lastError}: {row.lastError}
              </p>
            )}
            {row.status === "uncertain" && (
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={ack[row.id] === true}
                  onChange={(e) =>
                    setAck({ ...ack, [row.id]: e.target.checked })
                  }
                />
                <span>{t.ackUnknown}</span>
              </label>
            )}
            {row.status === "uncertain" && (
              <button
                type="button"
                className="mr-4 underline disabled:opacity-50"
                disabled={busy || !ack[row.id]}
                onClick={() => void confirmAccepted(row)}
              >
                {t.confirmAccepted}
              </button>
            )}
            {(row.status === "failed" || row.status === "uncertain") && (
              <button
                className="underline disabled:opacity-50"
                type="button"
                disabled={busy || (row.status === "uncertain" && !ack[row.id])}
                onClick={() => void retry(row)}
              >
                {t.retryDelivery}
              </button>
            )}
          </article>
        ))}
      </div>
      {(failure || error) && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {failure || error?.message}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
