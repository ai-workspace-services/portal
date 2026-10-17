"use client";
import { useState } from "react";
import useSWR from "swr";
import { useLanguage } from "@i18n/LanguageProvider";
import { emailCopy, emailRequest } from "@/lib/email-preferences";
const base = "/api/auth/admin/email-suppressions";
export default function EmailSuppressionPanel() {
  const { language } = useLanguage();
  const t = emailCopy(language);
  const { data, error, mutate } = useSWR<{
    suppressions: { email: string; reason: string }[];
  }>(base, emailRequest);
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("bounce");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [message, setMessage] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    try {
      await emailRequest(base, {
        method: "PUT",
        body: JSON.stringify({ email, reason }),
      });
      setEmail("");
      await mutate();
      setMessage(t.suppressionSaved);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{t.suppressionTitle}</h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        {t.suppressionDescription}
      </p>
      <form onSubmit={save} className="flex flex-wrap items-end gap-3">
        <label className="min-w-0 flex-1 space-y-1 text-sm">
          <span>{t.email}</span>
          <input
            className="block w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2"
            type="email"
            required
            disabled={busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>{t.reason}</span>
          <select
            disabled={busy}
            className="block rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            <option value="bounce">{t.bounce}</option>
            <option value="complaint">{t.complaint}</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {t.addSuppression}
        </button>
      </form>
      {data?.suppressions.length === 0 && (
        <p className="text-sm">{t.noSuppressions}</p>
      )}
      <ul className="space-y-2 text-sm">
        {data?.suppressions.map((row) => (
          <li
            className="break-all rounded-md border border-[color:var(--color-surface-border)] p-3"
            key={row.email}
          >
            {row.email} · {row.reason === "bounce" ? t.bounce : t.complaint}
          </li>
        ))}
      </ul>
      {(failure || error) && <p role="alert">{failure || error?.message}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
