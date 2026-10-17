"use client";
import { useState } from "react";
import useSWR from "swr";
import { useLanguage } from "@i18n/LanguageProvider";
import {
  emailCopy,
  emailRequest,
  type EmailManagementSettings,
} from "@/lib/email-preferences";

type Step = {
  id: string;
  version: number;
  enabled: boolean;
  subject: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  delayHours: number;
};
const base = "/api/auth/admin/email-onboarding";
const input =
  "w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm";
function StepEditor({
  initial,
  label,
  onSaved,
}: {
  initial: Step;
  label: string;
  onSaved: () => Promise<unknown>;
}) {
  const { language } = useLanguage();
  const t = emailCopy(language);
  const [step, setStep] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const [saved, setSaved] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    setSaved(false);
    try {
      await emailRequest(`${base}/${step.id}`, {
        method: "PUT",
        body: JSON.stringify(step),
      });
      setStep({ ...step, version: step.version + 1 });
      await onSaved();
      setSaved(true);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.saveFailed);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="space-y-3 rounded-md border border-[color:var(--color-surface-border)] p-4"
    >
      <h3 className="font-semibold">{label}</h3>
      <p className="text-sm text-[var(--color-text-muted)]">
        {step.id === "hello" ? t.helloNotice : t.tutorialNotice}
      </p>
      <fieldset disabled={busy} className="space-y-3">
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={step.enabled}
            onChange={(e) => {
              setStep({ ...step, enabled: e.target.checked });
              setSaved(false);
            }}
          />
          {t.enabled}
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t.delayHours}</span>
          <input
            className={input}
            type="number"
            min={step.id === "hello" ? 0 : 24}
            max={720}
            disabled={step.id === "hello"}
            required
            value={step.delayHours}
            onChange={(e) =>
              setStep({ ...step, delayHours: Number(e.target.value) })
            }
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t.subject}</span>
          <input
            className={input}
            required
            maxLength={200}
            value={step.subject}
            onChange={(e) => setStep({ ...step, subject: e.target.value })}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t.body}</span>
          <textarea
            className={input}
            rows={6}
            required
            maxLength={12000}
            value={step.body}
            onChange={(e) => setStep({ ...step, body: e.target.value })}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t.actionLabel}</span>
          <input
            className={input}
            maxLength={120}
            value={step.actionLabel}
            onChange={(e) => setStep({ ...step, actionLabel: e.target.value })}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span>{t.actionUrl}</span>
          <input
            type="url"
            className={input}
            value={step.actionUrl}
            onChange={(e) => setStep({ ...step, actionUrl: e.target.value })}
          />
        </label>
      </fieldset>
      <button
        disabled={busy}
        type="submit"
        className="min-h-11 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {t.saveStep}
      </button>
      {saved && (
        <p role="status" className="text-sm">
          {t.stepSaved}
        </p>
      )}
      {failure && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {failure}
        </p>
      )}
    </form>
  );
}
export default function EmailOnboardingPanel() {
  const { language } = useLanguage();
  const t = emailCopy(language);
  const { data, error, mutate } = useSWR<{ steps: Step[] }>(
    base,
    emailRequest,
    { revalidateOnFocus: false },
  );
  const settings = useSWR<EmailManagementSettings>(
    "/api/auth/admin/email-management",
    emailRequest,
    { revalidateOnFocus: false },
  );
  const labels: Record<string, string> = {
    hello: t.helloLabel,
    first_steps: t.first_stepsLabel,
    discover_more: t.discover_moreLabel,
  };
  return (
    <section className="space-y-5">
      <h2 className="text-lg font-semibold">{t.onboardingTitle}</h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        {t.onboardingDescription}
      </p>
      <p className="text-sm text-[var(--color-text-muted)]">
        {t.templateVariables}
      </p>
      {(error || settings.error) && (
        <p role="alert">{error?.message || settings.error?.message}</p>
      )}
      {data &&
        settings.data &&
        t.templates.map((template) => {
          const persisted = data.steps.find((step) => step.id === template.id);
          const initial: Step = persisted ?? {
            id: template.id,
            version: 0,
            enabled: false,
            subject: template.subject,
            body: template.body,
            delayHours: template.delayHours,
            actionLabel: settings.data?.consoleUrl ? template.actionLabel : "",
            actionUrl: settings.data?.consoleUrl
              ? settings.data.consoleUrl + template.path
              : "",
          };
          return (
            <StepEditor
              key={`${initial.id}:${language}`}
              initial={initial}
              label={labels[template.id]}
              onSaved={() => mutate()}
            />
          );
        })}
    </section>
  );
}
