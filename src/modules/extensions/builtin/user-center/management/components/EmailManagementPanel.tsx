"use client";
import BoundaryLink from "@/components/common/BoundaryLink";

import { useState } from "react";
import useSWR from "swr";
import { useLanguage } from "@i18n/LanguageProvider";
import {
  emailCopy,
  emailRequest,
  type EmailManagementSettings,
} from "@/lib/email-preferences";

import EmailCampaignWorkspace from "./EmailCampaignWorkspace";
import EmailOnboardingPanel from "./EmailOnboardingPanel";
import EmailDeliveryPanel from "./EmailDeliveryPanel";
import EmailSuppressionPanel from "./EmailSuppressionPanel";

const ENDPOINT = "/api/auth/admin/email-management";
const inputClass =
  "w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm";
const buttonClass =
  "rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50";
type Preview = {
  plainBody: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
};

function EmailSenderSettings() {
  const { language } = useLanguage();
  const t = emailCopy(language);
  const { data, error, isLoading, mutate } = useSWR<EmailManagementSettings>(
    ENDPOINT,
    emailRequest,
    { revalidateOnFocus: false },
  );
  const [draft, setDraft] = useState<EmailManagementSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [failure, setFailure] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const value = draft ?? data;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!value) return;
    setBusy(true);
    setFailure("");
    setStatus("");
    setPreview(null);
    try {
      const saved = await emailRequest<EmailManagementSettings>(ENDPOINT, {
        method: "PUT",
        body: JSON.stringify(value),
      });
      await mutate(saved, false);
      setDraft(null);
      setStatus(t.saved);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  async function loadPreview() {
    setBusy(true);
    setFailure("");
    setPreview(null);
    try {
      setPreview(
        await emailRequest<Preview>(`${ENDPOINT}/preview`, {
          method: "POST",
          body: "{}",
        }),
      );
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  if (isLoading) return <p role="status">{t.loading}</p>;
  if (error || !value)
    return (
      <div role="alert">
        <p>{error?.message ?? t.error}</p>
        <button type="button" onClick={() => void mutate()}>
          {t.retry}
        </button>
      </div>
    );
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.description}
        </p>
      </div>
      <form onSubmit={save} className="max-w-2xl space-y-4">
        <h3 className="font-medium">{t.identity}</h3>
        {(
          [
            "companyName",
            "postalAddress",
            "contactEmail",
            "consoleUrl",
          ] as const
        ).map((field) => (
          <label key={field} className="block space-y-1 text-sm">
            <span>{t[field]}</span>
            <input
              className={inputClass}
              type={
                field === "contactEmail"
                  ? "email"
                  : field === "consoleUrl"
                    ? "url"
                    : "text"
              }
              required
              maxLength={
                field === "postalAddress"
                  ? 1000
                  : field === "companyName"
                    ? 200
                    : 2048
              }
              value={value[field]}
              disabled={busy}
              onChange={(e) => {
                setDraft({ ...value, [field]: e.target.value });
                setPreview(null);
                setStatus("");
              }}
            />
          </label>
        ))}
        <div className="flex flex-wrap gap-3">
          <button className={buttonClass} disabled={busy} type="submit">
            {t.save}
          </button>
          <button
            className={inputClass + " w-auto"}
            disabled={busy || draft !== null || !data?.version}
            type="button"
            onClick={() => void loadPreview()}
          >
            {t.preview}
          </button>
        </div>
      </form>
      {status && (
        <p role="status" className="text-sm">
          {status}
        </p>
      )}
      {failure && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {failure}
        </p>
      )}
      {preview && (
        <section className="rounded-md border border-[color:var(--color-surface-border)] p-4">
          <h3 className="font-medium">{t.previewTitle}</h3>
          <p className="my-2 text-sm text-[var(--color-text-muted)]">
            {t.previewNote}
          </p>
          <pre className="whitespace-pre-wrap break-all text-sm">
            {preview.plainBody}
          </pre>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <a
              className="underline"
              href={preview.preferencesUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t.preferencesLink}
            </a>
            <a
              className="underline"
              href={preview.unsubscribeUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t.unsubscribeLink}
            </a>
          </div>
        </section>
      )}
      <section className="space-y-2 text-sm text-[var(--color-text-muted)]">
        <h3 className="font-medium text-[var(--color-heading)]">
          {t.controlsTitle}
        </h3>
        <p>{t.controlsBody}</p>
        <p>{t.noR}</p>
        <p>{t.scopeNote}</p>
        <BoundaryLink
          className="inline-block underline"
          href="/email/preferences"
        >
          {t.manageOwn}
        </BoundaryLink>
      </section>
    </div>
  );
}

export default function EmailManagementPanel() {
  const { language } = useLanguage();
  const t = emailCopy(language);
  const [section, setSection] = useState("campaigns");
  const sections = [
    { id: "campaigns", label: t.campaignSection },
    { id: "onboarding", label: t.onboardingSection },
    { id: "deliveries", label: t.deliverySection },
    { id: "suppressions", label: t.suppressionSection },
    { id: "sender", label: t.senderSection },
  ];
  return (
    <div className="space-y-5">
      <nav aria-label={t.title} className="flex flex-wrap gap-2">
        {sections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={section === item.id}
            onClick={() => setSection(item.id)}
            className={`min-h-11 rounded-md border px-3 py-2 text-sm ${section === item.id ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-[color:var(--color-surface-border)] text-[var(--color-text-muted)]"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {section === "campaigns" && <EmailCampaignWorkspace />}
      {section === "onboarding" && <EmailOnboardingPanel />}
      {section === "deliveries" && <EmailDeliveryPanel />}
      {section === "suppressions" && <EmailSuppressionPanel />}
      {section === "sender" && <EmailSenderSettings />}
    </div>
  );
}
