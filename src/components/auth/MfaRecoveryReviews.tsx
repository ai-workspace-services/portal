"use client";

import { useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { useUserStore } from "@lib/userStore";
import { useLanguage } from "@i18n/LanguageProvider";
import { accountSecurityCopy } from "@/lib/account-security";

type RecoveryRequest = {
  id: string;
  email: string;
  status: string;
  reason: string;
  reviewReason: string;
  createdAt: string;
  expiresAt: string;
};
const endpoint = "/api/auth/admin/mfa-recovery";
async function loadReviews(): Promise<{ requests: RecoveryRequest[] }> {
  const response = await fetch(endpoint, {
    cache: "no-store",
    credentials: "include",
  });
  if (!response.ok) throw new Error("recovery_queue_failed");
  return response.json();
}

export default function MfaRecoveryReviews() {
  const isRoot = useUserStore((state) => state.user?.isRoot === true);
  const { language } = useLanguage();
  const copy = accountSecurityCopy(language);
  const { data, error, mutate } = useSWR(isRoot ? endpoint : null, loadReviews);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);
  const selected = data?.requests.find((r) => r.id === selectedId);
  if (!isRoot) return null;

  async function decide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !selected || selected.status !== "pending_review")
      return;
    const decision = (event.nativeEvent as SubmitEvent).submitter?.getAttribute(
      "value",
    );
    if (decision !== "approved" && decision !== "rejected") return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `${endpoint}/${encodeURIComponent(selected.id)}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, reason, code }),
        },
      );
      if (!response.ok) throw new Error("recovery_decision_failed");
      setMessage(copy[decision]);
      setSelectedId("");
      setReason("");
      await mutate();
    } catch {
      setMessage(copy.error);
    } finally {
      setCode("");
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 border-b border-[var(--color-surface-border)] p-5">
      <h2 className="font-semibold">{copy.reviewTitle}</h2>
      <p className="text-sm text-[var(--color-text-subtle)]">
        {copy.reviewDescription}
      </p>
      <button type="button" onClick={() => void mutate()} disabled={busy}>
        {copy.refresh}
      </button>
      {error ? <p role="alert">{copy.error}</p> : null}
      {data?.requests.length === 0 ? <p>{copy.empty}</p> : null}
      {data?.requests.map((r) => (
        <div key={r.id} className="rounded-lg border p-3 text-sm">
          <p>
            {r.email} ·{" "}
            {r.status in copy ? copy[r.status as "pending_review"] : r.status}
          </p>
          <p>{r.reason}</p>
          <p>{r.reviewReason}</p>
          <time dateTime={r.createdAt}>
            {new Date(r.createdAt).toLocaleString()}
          </time>
          {r.status === "pending_review" &&
          Date.parse(r.expiresAt) > Date.now() ? (
            <button
              type="button"
              className="ml-3 underline"
              disabled={busy}
              onClick={() => {
                setSelectedId(r.id);
                setReason("");
                setCode("");
              }}
            >
              {copy.reviewTitle}
            </button>
          ) : null}
        </div>
      ))}
      {selected?.status === "pending_review" ? (
        <form onSubmit={decide} className="space-y-3 rounded-lg border p-4">
          <p>{selected.email}</p>
          <label className="block">
            {copy.reviewReason}
            <textarea
              className="block w-full rounded border p-2"
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <label className="block">
            {copy.rootCode}
            <input
              className="block rounded border p-2"
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <button
            type="submit"
            value="approved"
            disabled={busy}
            className="mr-4"
          >
            {busy ? copy.busy : copy.approve}
          </button>
          <button type="submit" value="rejected" disabled={busy}>
            {copy.reject}
          </button>
        </form>
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}
