"use client";
import BoundaryLink from "@/components/common/BoundaryLink";
import { useState } from "react";
import useSWR from "swr";
import { useLanguage } from "@i18n/LanguageProvider";
import {
  emailCopy,
  emailRequest,
  type EmailPreferences,
} from "@/lib/email-preferences";

export default function EmailPreferencesForm({
  token,
  unsubscribe = false,
}: {
  token?: string;
  unsubscribe?: boolean;
}) {
  const { language } = useLanguage();
  const t = emailCopy(language);
  const endpoint = `/api/auth/email-preferences${token ? `?key=${encodeURIComponent(token)}` : ""}`;
  const { data, error, isLoading, mutate } = useSWR<EmailPreferences>(
    unsubscribe ? null : endpoint,
    emailRequest,
    { revalidateOnFocus: false },
  );
  const [draft, setDraft] = useState<EmailPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [failure, setFailure] = useState("");
  const value = draft ?? data;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFailure("");
    setDone(false);
    try {
      if (unsubscribe) {
        await emailRequest(
          `/api/auth/email-unsubscribe${token ? `?key=${encodeURIComponent(token)}` : ""}`,
          { method: "POST", body: "{}" },
        );
      } else {
        const saved = await emailRequest<EmailPreferences>(endpoint, {
          method: "PUT",
          body: JSON.stringify(value),
        });
        await mutate(saved, false);
        setDraft(null);
      }
      setDone(true);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-12 text-[var(--color-heading)]">
      <h1 className="text-2xl font-semibold">
        {unsubscribe ? t.unsubscribeTitle : t.preferenceTitle}
      </h1>
      <p className="my-4 text-sm text-[var(--color-text-muted)]">
        {unsubscribe ? t.unsubscribeDescription : t.preferenceDescription}
      </p>
      {isLoading && <p role="status">{t.loading}</p>}
      {error ? (
        <div role="alert">
          <p>{t.invalidLink}</p>
          <BoundaryLink className="underline" href="/login">
            {t.signIn}
          </BoundaryLink>
          <button className="ml-4 underline" onClick={() => void mutate()}>
            {t.retry}
          </button>
        </div>
      ) : null}
      {!error && (unsubscribe || value) && !(unsubscribe && done) ? (
        <form onSubmit={submit} className="space-y-5">
          {!unsubscribe && value ? (
            <>
              <fieldset disabled={busy} className="space-y-4">
                {(["productUpdates", "tutorials", "offers"] as const).map(
                  (field) => (
                    <label
                      key={field}
                      className="flex min-h-11 items-center gap-3 rounded-md border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={value[field]}
                        onChange={(e) => {
                          setDraft({ ...value, [field]: e.target.checked });
                          setDone(false);
                        }}
                      />
                      <span>{t[field]}</span>
                    </label>
                  ),
                )}
              </fieldset>
              <label className="block space-y-2 text-sm">
                <span>{t.frequency}</span>
                <select
                  className="block w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3"
                  disabled={busy}
                  value={value.frequency}
                  onChange={(e) => {
                    setDraft({
                      ...value,
                      frequency: e.target
                        .value as EmailPreferences["frequency"],
                    });
                    setDone(false);
                  }}
                >
                  <option value="monthly">{t.monthly}</option>
                  <option value="important">{t.important}</option>
                </select>
              </label>
              <p className="text-sm text-[var(--color-text-muted)]">
                {t.consent}
              </p>
            </>
          ) : null}
          <button
            disabled={busy}
            className="min-h-11 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            type="submit"
          >
            {unsubscribe ? t.unsubscribeAction : t.savePreferences}
          </button>
        </form>
      ) : null}
      {done && (
        <p role="status" className="mt-4">
          {unsubscribe ? t.unsubscribed : t.preferencesSaved}
        </p>
      )}
      {failure && (
        <p role="alert" className="mt-4">
          {failure}
        </p>
      )}
      <p className="mt-6 text-sm text-[var(--color-text-muted)]">
        {t.serviceNotice}
      </p>
      {!token && (
        <BoundaryLink
          className="mt-4 inline-block text-sm underline"
          href="/panel/account"
        >
          {t.accountLink}
        </BoundaryLink>
      )}
    </main>
  );
}
