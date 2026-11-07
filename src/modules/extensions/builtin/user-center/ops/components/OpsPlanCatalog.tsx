"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Gift,
  History,
  Loader2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { useUserStore } from "@lib/userStore";
import { ADMIN_API_BASE } from "../../lib/adminApi";
import { buildPlanUpsertBody, type BillingPlan } from "../planUpsert";
import {
  CATALOG_FAMILIES,
  partitionCatalog,
  quotaFromGB,
  quotaToGB,
  type Family,
  type FamilyId,
} from "../planCatalog";

const inputClass =
  "w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-heading)] outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-muted)]";
const panelClass =
  "rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)]";
async function fetchPlans(url: string): Promise<{ plans: BillingPlan[] }> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("无法加载套餐目录，请重试。");
  return response.json();
}
function FamilyIcon({ id }: { id: FamilyId }) {
  const Icon = id === "beta" ? Clock3 : id === "gift" ? Gift : Box;
  const colors = {
    free: "bg-slate-100 text-slate-500",
    plus: "bg-blue-100 text-blue-600",
    pro: "bg-violet-100 text-violet-600",
    payg: "bg-emerald-100 text-emerald-600",
    beta: "bg-orange-100 text-orange-600",
    gift: "bg-slate-100 text-slate-500",
  };
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${colors[id]}`}
    >
      <Icon size={23} />
    </span>
  );
}
export default function OpsPlanCatalog() {
  const user = useUserStore((s) => s.user);
  const { data, error, isLoading, mutate } = useSWR(
    `${ADMIN_API_BASE}/billing/plans`,
    fetchPlans,
    { revalidateOnFocus: false },
  );
  const { families, legacy } = useMemo(
    () => partitionCatalog(data?.plans ?? []),
    [data],
  );
  const [selected, setSelected] = useState<FamilyId | null>("plus");
  const [showArchived, setShowArchived] = useState(false);
  const [notice, setNotice] = useState("");
  const canWrite = Boolean(
    user?.isRoot ||
    user?.isAdmin ||
    user?.permissions?.includes("*") ||
    user?.permissions?.includes("admin.billing.money.write"),
  );
  const [individual, setIndividual] = useState<BillingPlan | null>(null);
  const family = individual
    ? {
        ...CATALOG_FAMILIES[0],
        id: "free" as const,
        name: individual.displayName || individual.planId,
        variants: [individual],
      }
    : families.find((f) => f.id === selected);
  return (
    <div className="space-y-4 pb-8">
      <div
        className={`grid items-start gap-4 ${family ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]" : ""}`}
      >
        <section className={`${panelClass} min-w-0 p-4 sm:p-5`}>
          <header className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-heading)]">
                套餐目录
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                价格与流量权益
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
                aria-label="刷新套餐目录"
                onClick={() => void mutate()}
              >
                <RefreshCw
                  size={17}
                  className={isLoading ? "animate-spin" : ""}
                />
              </button>
              {canWrite && (
                <button
                  onClick={() => {
                    setIndividual({
                      planId: "",
                      kind: "subscription",
                      packageName: "custom",
                      displayName: "新套餐",
                      includedQuotaBytes: 0,
                      active: false,
                    });
                    setNotice("");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2.5 text-sm font-semibold text-white dark:bg-[var(--color-action)]"
                >
                  <Plus size={16} />
                  新建套餐
                </button>
              )}
            </div>
          </header>
          {error && (
            <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
              {error.message}
            </p>
          )}
          {isLoading ? (
            <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
              目录加载中…
            </p>
          ) : (
            <div className="space-y-3">
              {families.map((f) => {
                const persisted = f.variants.filter((v) =>
                  data?.plans.some((p) => p.planId === v.planId),
                );
                const published = persisted.some((v) => v.active);
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={selected === f.id}
                    onClick={() => {
                      setIndividual(null);
                      setSelected(f.id);
                      setNotice("");
                    }}
                    className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${selected === f.id ? "border-[var(--color-primary)] bg-[var(--color-primary-muted)]" : "border-[color:var(--color-surface-border)] hover:border-[var(--color-primary)]"}`}
                  >
                    <FamilyIcon id={f.id} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="text-base font-semibold text-[var(--color-heading)]">
                          {f.name}
                        </strong>
                        {f.id === "free" && (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                            默认
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-sm text-[var(--color-text-muted)]">
                        {f.description}
                      </span>
                      <span className="mt-3 block text-sm text-[var(--color-text-subtle)]">
                        {persisted.length
                          ? persisted
                              .map(
                                (p) =>
                                  `${p.displayName || p.planId} · ${quotaToGB(p.includedQuotaBytes)} GB`,
                              )
                              .join(" / ")
                          : "待配置"}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="block text-sm font-semibold text-[var(--color-heading)]">
                        {persisted.length
                          ? persisted
                              .map(
                                (p) =>
                                  `${p.priceCurrency || "CNY"} ${(p.priceAmount || 0) / 100} / ${p.priceUnit || "免费"}`,
                              )
                              .join(" · ")
                          : "待配置"}
                      </span>
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {published
                          ? "已发布"
                          : persisted.length
                            ? "草稿"
                            : "待配置"}
                      </span>
                    </span>
                    <ChevronRight
                      size={16}
                      className="mt-1 shrink-0 text-[var(--color-text-subtle)]"
                    />
                  </button>
                );
              })}
            </div>
          )}
          <div className="mt-4 border-t border-[color:var(--color-surface-border)] pt-3">
            <button
              onClick={() => setShowArchived((v) => !v)}
              aria-expanded={showArchived}
              className="flex w-full items-center gap-2 py-2 text-left text-sm text-[var(--color-heading)]"
            >
              <History size={17} />
              <span className="flex-1 font-medium">
                历史套餐与旧目录{" "}
                <span className="font-normal text-[var(--color-text-subtle)]">
                  {legacy.length} 项
                </span>
              </span>
              <ChevronDown
                size={16}
                className={showArchived ? "rotate-180" : ""}
              />
            </button>
            <p className="ml-6 text-xs leading-5 text-[var(--color-text-subtle)]">
              选择目录记录可编辑其价格、额度和发布状态。
            </p>
            {showArchived && (
              <div className="mt-3 divide-y divide-[color:var(--color-surface-border)]">
                {legacy.map((p) => (
                  <button
                    type="button"
                    onClick={() => setIndividual(p)}
                    key={p.planId}
                    className="flex flex-wrap justify-between gap-2 py-3 text-sm"
                  >
                    <span>
                      {p.displayName || p.planId}
                      <small className="mt-1 block text-[var(--color-text-subtle)]">
                        {p.planId}
                      </small>
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {p.active ? "已发布 · 编辑" : "草稿 · 编辑"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
        {family && (
          <CatalogEditor
            key={individual ? `individual-${individual.planId}` : family.id}
            family={family}
            plans={data?.plans ?? []}
            canWrite={canWrite}
            onClose={() => {
              setIndividual(null);
              setSelected(null);
            }}
            onSaved={async (message) => {
              const refreshed = await mutate();
              if (individual?.planId)
                setIndividual(
                  refreshed?.plans.find(
                    (p) => p.planId === individual.planId,
                  ) || null,
                );
              setNotice(message);
            }}
          />
        )}
      </div>
      <p className="text-xs leading-5 text-[var(--color-text-subtle)]">
        套餐价格与配额保存后可重新读取核对。账户额度以账户用量接口为准。
      </p>
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-[var(--color-success-foreground)]"
        >
          <Check size={16} />
          {notice}
        </p>
      )}
    </div>
  );
}

type EditState = {
  name: string;
  quotaGB: string;
  amount: string;
  stripePriceId: string;
  planId: string;
  kind: string;
  packageName: string;
  reason: string;
  active: boolean;
  currency: string;
  unit: string;
};
function formFor(plan: BillingPlan): EditState {
  return {
    name: plan.displayName ?? "",
    quotaGB: quotaToGB(plan.includedQuotaBytes),
    amount: String((plan.priceAmount ?? 0) / 100),
    stripePriceId: plan.stripePriceId ?? "",
    planId: plan.planId,
    kind: plan.kind,
    packageName: plan.packageName || "custom",
    reason: "",
    active: plan.active ?? false,
    currency: plan.priceCurrency || "CNY",
    unit: plan.priceUnit || "month",
  };
}
function CatalogEditor({
  family,
  plans,
  canWrite,
  onClose,
  onSaved,
}: {
  family: Family;
  plans: BillingPlan[];
  canWrite: boolean;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [variantIndex, setVariantIndex] = useState(0);
  const [draft, setDraft] = useState(() => formFor(family.variants[0]));
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const plan = family.variants[variantIndex];
  const existing = plans.find((p) => p.planId === plan.planId);
  const patch = <K extends keyof EditState>(key: K, value: EditState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const save = async () => {
    setError("");
    try {
      if (!draft.planId.trim() || !draft.name.trim() || !draft.reason.trim())
        throw new Error("请填写名称与操作原因。");
      const bytes = quotaFromGB(draft.quotaGB);
      if (
        !/^\d+(\.\d{1,2})?$/.test(draft.amount) ||
        !Number.isSafeInteger(Math.round(Number(draft.amount) * 100))
      )
        throw new Error("价格须为有效金额，最多支持两位小数。");
      if (draft.stripePriceId && !draft.stripePriceId.startsWith("price_"))
        throw new Error("请填写有效的 Stripe Price ID。");
      const body = buildPlanUpsertBody(
        {
          planId: draft.planId,
          displayName: draft.name,
          kind: draft.kind,
          packageName: draft.packageName,
          stripePriceId: draft.stripePriceId,
          includedQuotaBytes: String(bytes),
          trialDays: String(plan.trialDays ?? 0),
          sortOrder: String(
            CATALOG_FAMILIES.findIndex((f) => f.id === family.id) * 10 +
              variantIndex,
          ),
          active: draft.active,
          reason: draft.reason,
        },
        existing ?? plan,
      );
      body.priceAmount = Math.round(Number(draft.amount) * 100);
      body.priceCurrency = body.priceAmount ? draft.currency : "";
      body.priceUnit = body.priceAmount ? draft.unit : "";
      body.features = { ...plan.features };
      setSaving(true);
      const response = await fetch(
        `${ADMIN_API_BASE}/billing/plans/${encodeURIComponent(draft.planId.trim())}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "保存失败，请重试。",
        );
      }
      await onSaved(
        `${draft.name} ${draft.active ? "已发布" : "已保存为草稿或停用"}。`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败。");
    } finally {
      setSaving(false);
    }
  };
  return (
    <aside
      className={`${panelClass} min-w-0 lg:sticky lg:top-4`}
      aria-label={`编辑 ${family.name}`}
    >
      <header className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] p-5">
        <h2 className="text-xl font-semibold text-[var(--color-heading)]">
          编辑 {family.name}
        </h2>
        <button
          onClick={onClose}
          aria-label="关闭编辑栏"
          className="rounded p-1 text-[var(--color-text-subtle)]"
        >
          <X size={19} />
        </button>
      </header>
      <div className="space-y-5 p-5">
        {family.variants.length > 1 && (
          <div
            className="flex rounded-lg bg-[var(--color-surface-muted)] p-1"
            aria-label="套餐档位"
          >
            {family.variants.map((v, i) => (
              <button
                key={v.planId}
                onClick={() => {
                  setVariantIndex(i);
                  setDraft(formFor(v));
                  setError("");
                }}
                className={`flex-1 rounded-md px-3 py-2 text-sm ${i === variantIndex ? "bg-[var(--color-surface-elevated)] font-semibold text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-muted)]"}`}
              >
                {family.id === "free"
                  ? `${quotaToGB(v.includedQuotaBytes)} GB`
                  : v.priceUnit === "year"
                    ? "年付"
                    : "月付"}
              </button>
            ))}
          </div>
        )}
        <fieldset
          disabled={!canWrite || saving}
          className="space-y-5 disabled:opacity-70"
        >
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-[var(--color-heading)]">
              基本信息
            </h3>
            {existing ? (
              <p className="break-all text-xs">{existing.planId}</p>
            ) : (
              <Field
                label="套餐 ID"
                value={draft.planId}
                onChange={(v) => patch("planId", v)}
              />
            )}
            <label className="block text-sm">
              类型
              <select
                className={inputClass}
                value={draft.kind}
                onChange={(e) => patch("kind", e.target.value)}
              >
                <option value="subscription">订阅</option>
                <option value="trial">试用</option>
                <option value="paygo_topup">固定金额充值</option>
              </select>
            </label>
            <Field
              label="计费套餐名"
              value={draft.packageName}
              onChange={(v) => patch("packageName", v)}
            />
            <Field
              label="套餐名称"
              value={draft.name}
              onChange={(v) => patch("name", v)}
            />
            <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
              <span>状态</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                {existing?.active ? "已发布" : "草稿"}
              </span>
            </div>
          </section>
          <Section title="价格与配额">
            <Field
              label="价格"
              type="number"
              value={draft.amount}
              onChange={(v) => patch("amount", v)}
            />
            <label className="block text-sm">
              币种
              <select
                className={inputClass}
                value={draft.currency}
                onChange={(e) => patch("currency", e.target.value)}
              >
                <option value="CNY">CNY</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="block text-sm">
              计价单位
              <select
                className={inputClass}
                value={draft.unit}
                onChange={(e) => patch("unit", e.target.value)}
              >
                <option value="month">月</option>
                <option value="year">年</option>
                <option value="once">次</option>
                <option value="gb">GB</option>
              </select>
            </label>
            <Field
              label="账户配额（GB）"
              type="number"
              value={draft.quotaGB}
              onChange={(v) => patch("quotaGB", v)}
            />
            <p className="text-xs text-[var(--color-text-muted)]">
              额度耗尽后暂停。发布后，可在账号处置台选择邮箱指派此套餐。已导入的自定义配额按账户记录生效。
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => patch("active", e.target.checked)}
              />
              发布并开放应用
            </label>
          </Section>
          <details className="border-t border-[color:var(--color-surface-border)] pt-3">
            <summary className="cursor-pointer text-xs text-[var(--color-text-subtle)]">
              更多设置（Stripe 映射等）
            </summary>
            <div className="mt-3 space-y-3">
              <p className="break-all font-mono text-xs text-[var(--color-text-subtle)]">
                {plan.planId}
              </p>
              <Field
                label="Stripe Price ID"
                value={draft.stripePriceId}
                onChange={(v) => patch("stripePriceId", v)}
              />
              <p className="text-xs leading-5 text-[var(--color-text-subtle)]">
                新版本需使用匹配的新价格映射，旧订阅的映射保留。
              </p>
            </div>
          </details>
          <label className="block space-y-1.5 text-sm text-[var(--color-text-muted)]">
            <span>操作原因</span>
            <textarea
              className={inputClass}
              rows={2}
              value={draft.reason}
              onChange={(e) => patch("reason", e.target.value)}
              placeholder="填写本次配置调整原因"
            />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </div>
      <footer className="flex justify-end gap-2 border-t border-[color:var(--color-surface-border)] p-4">
        <button
          onClick={onClose}
          className="rounded-lg border border-[color:var(--color-surface-border)] px-4 py-2 text-sm text-[var(--color-text-muted)]"
        >
          取消
        </button>
        <button
          disabled={!canWrite || saving}
          onClick={() => void save()}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[var(--color-action)]"
        >
          {saving && <Loader2 size={15} className="animate-spin" />}
          保存并应用设置
        </button>
      </footer>
    </aside>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-[color:var(--color-surface-border)] pt-5">
      <h3 className="text-sm font-semibold text-[var(--color-heading)]">
        {title}
      </h3>
      {children}
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  min = 0,
  max,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block space-y-1.5 text-sm text-[var(--color-text-muted)]">
      <span>{label}</span>
      <input
        className={inputClass}
        type={type}
        min={type === "number" ? min : undefined}
        max={type === "number" ? max : undefined}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
