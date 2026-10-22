"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLanguage } from "@i18n/LanguageProvider";
import { accountSecurityCopy } from "@/lib/account-security";
import {
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from "@components/auth/AuthLayout";

export default function MfaRecoveryForm() {
  const { language } = useLanguage();
  const copy = accountSecurityCopy(language);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [reason, setReason] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const lock = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || pending) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/auth/mfa/recovery/${sent ? "confirm" : "request"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            sent ? { email, code, reason, authorized } : { email },
          ),
        },
      );
      const data = await response.json();
      if (
        !response.ok ||
        data.status !== (sent ? "pending_review" : "verification_requested")
      )
        throw new Error("recovery_failed");
      if (sent) {
        setPending(true);
        setCode("");
        setMessage(copy.pending_review);
      } else {
        setSent(true);
        setMessage(copy.requested);
      }
    } catch {
      setMessage(copy.error);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      className="mt-6 space-y-4 border-t border-[var(--color-surface-border)] pt-6"
      aria-labelledby="mfa-recovery-title"
    >
      <h2 id="mfa-recovery-title" className="font-semibold">
        {copy.recoveryTitle}
      </h2>
      <p className="text-sm text-[var(--color-text-subtle)]">
        {copy.recoveryDescription}
      </p>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-sm">
          {copy.email}
          <input
            className={AUTH_INPUT_CLASS}
            type="email"
            autoComplete="email"
            value={email}
            required
            readOnly={sent}
            disabled={busy || pending}
            onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
          />
        </label>
        {sent && !pending ? (
          <>
            <label className="block text-sm">
              {copy.code}
              <input
                className={AUTH_INPUT_CLASS}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
            </label>
            <label className="block text-sm">
              {copy.reason}
              <textarea
                className={AUTH_INPUT_CLASS}
                value={reason}
                minLength={5}
                maxLength={1000}
                required
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                required
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
              />
              {copy.authorize}
            </label>
          </>
        ) : null}
        {!pending ? (
          <button
            type="submit"
            disabled={busy || (sent && !authorized)}
            className={AUTH_PRIMARY_BUTTON_CLASS}
          >
            {busy ? copy.busy : sent ? copy.submit : copy.sendCode}
          </button>
        ) : null}
        {message ? (
          <p role="status" className="text-sm">
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
