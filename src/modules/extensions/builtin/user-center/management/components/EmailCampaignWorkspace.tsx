"use client";

import { useState } from "react";
import useSWR from "swr";
import { useLanguage } from "@i18n/LanguageProvider";
import { emailCopy, emailRequest } from "@/lib/email-preferences";
import EmailDeliveryPanel from "./EmailDeliveryPanel";

const BASE = "/api/auth/admin/email-campaigns";
const input =
  "w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm";
const button =
  "min-h-11 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50";
export type EmailCampaign = {
  id: string;
  version: number;
  kind: "feature" | "app_release" | "announcement";
  subject: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  audience: "all" | "free" | "subscriber" | "team";
  deliveryMode: "important" | "monthly";
  status: string;
};
type Preview = {
  version: number;
  recipients: number;
  matched: number;
  excluded: number;
  plainBody: string;
  audienceDigest: string;
};
const empty: EmailCampaign = {
  id: "",
  version: 0,
  kind: "feature",
  subject: "",
  body: "",
  actionLabel: "",
  actionUrl: "",
  audience: "all",
  deliveryMode: "important",
  status: "draft",
};

export default function EmailCampaignWorkspace() {
  const { language } = useLanguage();
  const t = emailCopy(language);
  const { data, error, mutate } = useSWR<{
    campaigns: EmailCampaign[];
    senderReady: boolean;
    backgroundEnabled: boolean;
  }>(BASE, emailRequest, { refreshInterval: 15000 });
  const [draft, setDraft] = useState<EmailCampaign>({ ...empty });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState("");
  const [message, setMessage] = useState("");
  const [deliveryCampaign, setDeliveryCampaign] = useState<string | null>(null);
  const editable = draft.status === "draft";
  function change<K extends keyof EmailCampaign>(
    field: K,
    value: EmailCampaign[K],
  ) {
    setDraft({ ...draft, [field]: value });
    setDirty(true);
    setPreview(null);
    setConfirming(false);
    setMessage("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFailure("");
    setMessage("");
    setPreview(null);
    setConfirming(false);
    try {
      const saved = await emailRequest<EmailCampaign>(
        draft.id ? `${BASE}/${draft.id}` : BASE,
        { method: draft.id ? "PUT" : "POST", body: JSON.stringify(draft) },
      );
      setDraft(saved);
      setDirty(false);
      await mutate();
      setMessage(t.savedDraft);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  async function previewAudience() {
    setBusy(true);
    setFailure("");
    setConfirming(false);
    setPreview(null);
    try {
      setPreview(
        await emailRequest<Preview>(`${BASE}/${draft.id}/preview`, {
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
  async function launch() {
    if (!preview) return;
    setBusy(true);
    setFailure("");
    try {
      await emailRequest(`${BASE}/${draft.id}/launch`, {
        method: "POST",
        body: JSON.stringify({
          version: preview.version,
          recipients: preview.recipients,
          audienceDigest: preview.audienceDigest,
        }),
      });
      setDraft({ ...draft, status: "queued", version: draft.version + 1 });
      setPreview(null);
      setConfirming(false);
      setMessage(t.queued);
      setDeliveryCampaign(draft.id);
      await mutate();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.error);
      setConfirming(false);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  async function cancelCampaign(campaign: EmailCampaign) {
    setBusy(true);
    setFailure("");
    try {
      await emailRequest(`${BASE}/${campaign.id}/cancel`, {
        method: "POST",
        body: "{}",
      });
      if (draft.id === campaign.id) setDraft({ ...draft, status: "cancelled" });
      setPreview(null);
      setConfirming(false);
      await mutate();
      setMessage(t.cancelled);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">{t.campaignTitle}</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {t.campaignDescription}
        </p>
      </header>
      {data && !data.senderReady && (
        <p role="status" className="text-sm">
          {t.senderMissing}
        </p>
      )}
      {data && !data.backgroundEnabled && (
        <p className="text-sm text-[var(--color-text-muted)]">
          {t.workerManual}
        </p>
      )}
      {error && <p role="alert">{error.message}</p>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)]">
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-medium">{draft.id ? t.edit : t.newCampaign}</h3>
            <button
              type="button"
              className="text-sm underline"
              disabled={busy}
              onClick={() => {
                setDraft({ ...empty });
                setDirty(false);
                setPreview(null);
                setConfirming(false);
                setDeliveryCampaign(null);
              }}
            >
              {t.newCampaign}
            </button>
          </div>
          <fieldset disabled={busy || !editable} className="space-y-4">
            <label className="block space-y-1 text-sm">
              <span>{t.kind}</span>
              <select
                className={input}
                value={draft.kind}
                onChange={(e) =>
                  change("kind", e.target.value as EmailCampaign["kind"])
                }
              >
                {(["feature", "app_release", "announcement"] as const).map(
                  (k) => (
                    <option key={k} value={k}>
                      {t[k]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t.subject}</span>
              <input
                className={input}
                required
                maxLength={200}
                value={draft.subject}
                onChange={(e) => change("subject", e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t.body}</span>
              <textarea
                className={input}
                required
                rows={9}
                maxLength={12000}
                value={draft.body}
                onChange={(e) => change("body", e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t.actionLabel}</span>
              <input
                className={input}
                maxLength={120}
                value={draft.actionLabel}
                onChange={(e) => change("actionLabel", e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>{t.actionUrl}</span>
              <input
                type="url"
                className={input}
                value={draft.actionUrl}
                onChange={(e) => change("actionUrl", e.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span>{t.audience}</span>
                <select
                  className={input}
                  value={draft.audience}
                  onChange={(e) =>
                    change(
                      "audience",
                      e.target.value as EmailCampaign["audience"],
                    )
                  }
                >
                  {(["all", "free", "subscriber", "team"] as const).map((k) => (
                    <option key={k} value={k}>
                      {t[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span>{t.deliveryMode}</span>
                <select
                  className={input}
                  value={draft.deliveryMode}
                  onChange={(e) =>
                    change(
                      "deliveryMode",
                      e.target.value as EmailCampaign["deliveryMode"],
                    )
                  }
                >
                  <option value="important">{t.importantMode}</option>
                  <option value="monthly">{t.monthlyMode}</option>
                </select>
              </label>
            </div>
          </fieldset>
          <p className="text-sm text-[var(--color-text-muted)]">
            {t.campaignLimits}
          </p>
          {editable && (
            <div className="flex flex-wrap gap-3">
              <button className={button} type="submit" disabled={busy}>
                {t.saveDraft}
              </button>
              <button
                type="button"
                className={input + " w-auto"}
                disabled={busy || dirty || !draft.id}
                onClick={() => void previewAudience()}
              >
                {t.previewAudience}
              </button>
            </div>
          )}
          {dirty && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {t.saveBeforePreview}
            </p>
          )}
        </form>
        <section className="space-y-3">
          {data?.campaigns.length === 0 && (
            <p className="text-sm">{t.noCampaigns}</p>
          )}
          {data?.campaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="space-y-3 rounded-md border border-[color:var(--color-surface-border)] p-3"
            >
              <h3 className="break-words text-sm font-medium">
                {campaign.subject}
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                {campaign.status === "draft"
                  ? t.draft
                  : campaign.status === "completed"
                    ? t.completed
                    : campaign.status === "cancelled"
                      ? t.cancelled
                      : t.queued}{" "}
                · {t[campaign.kind]} · {t[campaign.audience]}
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <button
                  className="underline"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDraft(campaign);
                    setDirty(false);
                    setPreview(null);
                    setConfirming(false);
                    setFailure("");
                  }}
                >
                  {t.edit}
                </button>
                <button
                  className="underline"
                  type="button"
                  onClick={() => setDeliveryCampaign(campaign.id)}
                >
                  {t.viewDeliveries}
                </button>
                {(campaign.status === "queued" ||
                  campaign.status === "draft") && (
                  <button
                    className="underline"
                    type="button"
                    disabled={busy}
                    onClick={() => void cancelCampaign(campaign)}
                  >
                    {t.cancelCampaign}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
      {preview && (
        <section className="space-y-3 rounded-md border border-[color:var(--color-surface-border)] p-4">
          <div className="flex flex-wrap gap-5 text-sm">
            <span>
              {t.matched}: {preview.matched}
            </span>
            <strong>
              {t.recipients}: {preview.recipients}
            </strong>
            <span>
              {t.excluded}: {preview.excluded}
            </span>
          </div>
          <pre className="whitespace-pre-wrap break-words text-sm">
            {preview.plainBody}
          </pre>
          {editable && (
            <button
              type="button"
              className={button}
              disabled={busy || !preview.recipients || !data?.senderReady}
              onClick={() => setConfirming(true)}
            >
              {t.queueCampaign}
            </button>
          )}
        </section>
      )}
      {confirming && preview && (
        <section
          role="group"
          aria-label={t.confirmQueue}
          className="space-y-3 rounded-md border border-[color:var(--color-primary)] p-4"
        >
          <p className="text-sm">{t.queueWarning}</p>
          <p className="font-semibold">
            {t.recipients}: {preview.recipients}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              className={button}
              disabled={busy}
              onClick={() => void launch()}
            >
              {t.confirmQueue}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              {t.cancelConfirm}
            </button>
          </div>
        </section>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {failure && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {failure}
        </p>
      )}
      {deliveryCampaign && <EmailDeliveryPanel campaignId={deliveryCampaign} />}
    </div>
  );
}
