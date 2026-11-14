"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Box,
  Check,
  ChevronDown,
  ChevronRight,
  History,
  Loader2,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useUserStore } from "@lib/userStore";
import { ADMIN_API_BASE } from "../../lib/adminApi";
import { buildPlanUpsertBody, type BillingPlan } from "../planUpsert";
import {
  CATALOG_FAMILIES,
  inferFamilyId,
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
  const Icon = id === "custom" ? SlidersHorizontal : Box;
  const colors: Record<FamilyId, string> = {
    free: "bg-slate-100 text-slate-600",
    plus: "bg-blue-100 text-blue-600",
    pro: "bg-violet-100 text-violet-600",
    custom: "bg-amber-100 text-amber-700",
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
        ...CATALOG_FAMILIES[3],
        id: (inferFamilyId(individual) ?? "custom") as FamilyId,
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
                套餐目录（源头配置）
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                仅维护 Free / Plus / Pro / Custom 四个系列（3 天欠款宽限期），实时同步至订阅中心、XConnect 方案与定价页。
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
                      priceAmount: 0,
                      priceCurrency: "CNY",
                      priceUnit: "month",
                      features: {
                        family: "custom",
                        dunning: { grace_days: 3 },
                      },
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
                              .map((p) => {
                                const gb = quotaToGB(p.includedQuotaBytes);
                                return gb && Number(gb) > 0
                                  ? `${p.displayName || p.planId} · ${gb} GB`
                                  : p.displayName || p.planId;
                              })
                              .join(" / ")
                          : f.summary}
                      </span>
                    </span>
                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="block text-sm font-semibold text-[var(--color-heading)]">
                        {persisted.length
                          ? persisted
                              .map((p) => {
                                const unitLabel =
                                  typeof p.features?.price_unit_label ===
                                    "string" && p.features.price_unit_label
                                    ? p.features.price_unit_label
                                    : p.priceUnit || "免费";
                                return `${p.priceCurrency || "CNY"} ${(p.priceAmount || 0) / 100} / ${unitLabel}`;
                              })
                              .join(" · ")
                          : f.price}
                      </span>
                      <span
                        className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs ${published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                      >
                        {published
                          ? "已发布"
                          : persisted.length
                            ? "草稿/已停用"
                            : "待初始化"}
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
          {legacy.length > 0 && (
            <div className="mt-4 border-t border-[color:var(--color-surface-border)] pt-3">
              <button
                onClick={() => setShowArchived((v) => !v)}
                aria-expanded={showArchived}
                className="flex w-full items-center gap-2 py-2 text-left text-sm text-[var(--color-heading)]"
              >
                <History size={17} />
                <span className="flex-1 font-medium">
                  待清理历史记录（trial / payg / beta）{" "}
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
                历史目录记录已从前台隐藏；如需归档停用，可点选后取消「发布并开放应用」或迁移至四大系列。
              </p>
              {showArchived && (
                <div className="mt-3 divide-y divide-[color:var(--color-surface-border)]">
                  {legacy.map((p) => (
                    <button
                      type="button"
                      onClick={() => setIndividual(p)}
                      key={p.planId}
                      className="flex w-full flex-wrap justify-between gap-2 py-3 text-left text-sm"
                    >
                      <span>
                        {p.displayName || p.planId}
                        <small className="mt-1 block text-[var(--color-text-subtle)]">
                          {p.planId} ({p.kind})
                        </small>
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {p.active ? "仍在库中启用 · 点击编辑" : "已停用"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
              if (individual?.planId) {
                setIndividual(
                  refreshed?.plans.find(
                    (p) => p.planId === individual.planId,
                  ) || null,
                );
              }
              setNotice(message);
            }}
          />
        )}
      </div>
      <p className="text-xs leading-5 text-[var(--color-text-subtle)]">
        套餐价格、配额与展示文案保存后将即时同步至 `/panel/subscription`、`/products/xconnect` 与 `/prices/`。
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
  packageName: FamilyId;
  reason: string;
  active: boolean;
  currency: string;
  unit: string;
  priceUnitLabel: string;
  quotaLabel: string;
  description: string;
  resources: string;
  exitIp: string;
  ipChanges: string;
  support: string;
  graceDays: string;
  marketingFeatures: string;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function formFor(plan: BillingPlan, fallbackFamily: FamilyId): EditState {
  const features = plan.features ?? {};
  const matrix =
    (features.comparison_matrix as Record<string, unknown> | undefined) ?? {};
  const dunning =
    (features.dunning as Record<string, unknown> | undefined) ?? {};
  const bulletList = Array.isArray(features.marketing_features)
    ? features.marketing_features
        .filter((x): x is string => typeof x === "string")
        .join("\n")
    : "";
  const rawFamily = (inferFamilyId(plan) ?? fallbackFamily) as FamilyId;
  const rawGrace = Number(dunning.grace_days);
  return {
    name: plan.displayName ?? "",
    quotaGB: quotaToGB(plan.includedQuotaBytes) || "0",
    amount: String((plan.priceAmount ?? 0) / 100),
    stripePriceId: plan.stripePriceId ?? "",
    planId: plan.planId,
    kind: plan.kind === "service" ? "service" : "subscription",
    packageName: rawFamily,
    reason: "",
    active: plan.active ?? false,
    currency: plan.priceCurrency || "CNY",
    unit: plan.priceUnit || "month",
    priceUnitLabel: asString(features.price_unit_label),
    quotaLabel: asString(features.quota_label),
    description: asString(features.description),
    resources: asString(matrix.resources),
    exitIp: asString(matrix.exit_ip),
    ipChanges: asString(matrix.ip_changes),
    support: asString(matrix.support),
    graceDays:
      Number.isFinite(rawGrace) && rawGrace > 0 && rawGrace !== 14
        ? String(rawGrace)
        : "3",
    marketingFeatures: bulletList,
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
  const [draft, setDraft] = useState(() =>
    formFor(family.variants[0], family.id),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const plan = family.variants[variantIndex] ?? family.variants[0];
  const existing = plans.find((p) => p.planId === plan.planId);
  const patch = <K extends keyof EditState>(key: K, value: EditState[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    setError("");
    try {
      if (!draft.planId.trim() || !draft.name.trim() || !draft.reason.trim()) {
        throw new Error("请填写套餐 ID、名称与操作原因。");
      }
      const bytes = quotaFromGB(draft.quotaGB);
      if (
        !/^\d+(\.\d{1,2})?$/.test(draft.amount) ||
        !Number.isSafeInteger(Math.round(Number(draft.amount) * 100))
      ) {
        throw new Error("价格须为有效金额，最多支持两位小数。");
      }
      if (draft.stripePriceId && !draft.stripePriceId.startsWith("price_")) {
        throw new Error("请填写有效的 Stripe Price ID（price_ 开头）。");
      }
      const parsedGrace = Math.max(1, Math.round(Number(draft.graceDays) || 3));
      const body = buildPlanUpsertBody(
        {
          planId: draft.planId,
          displayName: draft.name,
          kind: draft.kind,
          packageName: draft.packageName,
          stripePriceId: draft.stripePriceId,
          includedQuotaBytes: String(bytes),
          sortOrder: String(
            CATALOG_FAMILIES.findIndex((f) => f.id === draft.packageName) * 10 +
              variantIndex,
          ),
          active: draft.active,
          reason: draft.reason,
        },
        existing ?? plan,
      );
      body.priceAmount = Math.round(Number(draft.amount) * 100);
      body.priceCurrency = body.priceAmount ? draft.currency : "CNY";
      body.priceUnit = draft.unit || "month";

      const prevFeatures = (existing?.features ?? plan.features ?? {}) as Record<
        string,
        unknown
      >;
      const prevDunning =
        (prevFeatures.dunning as Record<string, unknown> | undefined) ?? {};
      const bullets = draft.marketingFeatures
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      body.features = {
        ...prevFeatures,
        family: draft.packageName,
        checkout_mode:
          draft.kind === "service" ||
          draft.unit === "once" ||
          draft.unit === "hour"
            ? "payment"
            : "subscription",
        ...(draft.priceUnitLabel.trim()
          ? { price_unit_label: draft.priceUnitLabel.trim() }
          : {}),
        ...(draft.quotaLabel.trim()
          ? { quota_label: draft.quotaLabel.trim() }
          : {}),
        ...(draft.description.trim()
          ? { description: draft.description.trim() }
          : {}),
        ...(bullets.length ? { marketing_features: bullets } : {}),
        dunning: {
          ...prevDunning,
          grace_days: parsedGrace,
        },
        comparison_matrix: {
          ...((prevFeatures.comparison_matrix as Record<string, unknown>) ??
            {}),
          resources: draft.resources.trim(),
          exit_ip: draft.exitIp.trim(),
          ip_changes: draft.ipChanges.trim(),
          support: draft.support.trim(),
        },
      };

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
        const resData = await response.json().catch(() => null);
        throw new Error(
          typeof resData?.message === "string"
            ? resData.message
            : "保存失败，请重试。",
        );
      }
      await onSaved(
        `${draft.name} ${draft.active ? "已发布并同步" : "已保存为草稿或停用"}。`,
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
            className="flex flex-wrap gap-1 rounded-lg bg-[var(--color-surface-muted)] p-1"
            aria-label="套餐档位"
          >
            {family.variants.map((v, i) => (
              <button
                key={v.planId}
                onClick={() => {
                  setVariantIndex(i);
                  setDraft(formFor(v, family.id));
                  setError("");
                }}
                className={`flex-1 rounded-md px-3 py-2 text-xs sm:text-sm ${i === variantIndex ? "bg-[var(--color-surface-elevated)] font-semibold text-[var(--color-primary)] shadow-sm" : "text-[var(--color-text-muted)]"}`}
              >
                {v.displayName || v.planId}
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
              <p className="break-all font-mono text-xs text-[var(--color-text-subtle)]">
                {existing.planId}
              </p>
            ) : (
              <Field
                label="套餐 ID"
                value={draft.planId}
                onChange={(v) => patch("planId", v)}
              />
            )}
            <label className="block text-sm text-[var(--color-text-muted)]">
              所属系列（四大系列）
              <select
                className={inputClass}
                value={draft.packageName}
                onChange={(e) =>
                  patch("packageName", e.target.value as FamilyId)
                }
              >
                <option value="free">free（免费）</option>
                <option value="plus">plus（Plus 订阅）</option>
                <option value="pro">pro（Pro 订阅）</option>
                <option value="custom">custom（定制节点 / 付费服务）</option>
              </select>
            </label>
            <label className="block text-sm text-[var(--color-text-muted)]">
              计费类型
              <select
                className={inputClass}
                value={draft.kind}
                onChange={(e) => patch("kind", e.target.value)}
              >
                <option value="subscription">订阅（subscription）</option>
                <option value="service">一次性服务（service）</option>
              </select>
            </label>
            <Field
              label="套餐名称"
              value={draft.name}
              onChange={(v) => patch("name", v)}
            />
          </section>
          <Section title="价格、配额与宽限期">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="价格"
                type="number"
                value={draft.amount}
                onChange={(v) => patch("amount", v)}
              />
              <label className="block text-sm text-[var(--color-text-muted)]">
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
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm text-[var(--color-text-muted)]">
                计价周期
                <select
                  className={inputClass}
                  value={draft.unit}
                  onChange={(e) => patch("unit", e.target.value)}
                >
                  <option value="month">月（month）</option>
                  <option value="year">年（year）</option>
                  <option value="hour">小时（hour）</option>
                  <option value="once">次（once）</option>
                </select>
              </label>
              <Field
                label="展示单位文案（如 小时/次）"
                value={draft.priceUnitLabel}
                onChange={(v) => patch("priceUnitLabel", v)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="账户配额（GB）"
                type="number"
                value={draft.quotaGB}
                onChange={(v) => patch("quotaGB", v)}
              />
              <Field
                label="欠款宽限期（天）"
                type="number"
                min={1}
                value={draft.graceDays}
                onChange={(v) => patch("graceDays", v)}
              />
            </div>
            <Field
              label="自定义规格标签（如 独享IP · 独享节点）"
              value={draft.quotaLabel}
              onChange={(v) => patch("quotaLabel", v)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => patch("active", e.target.checked)}
              />
              发布并开放应用
            </label>
          </Section>
          <Section title="四处同步展示文案与矩阵属性">
            <Field
              label="方案简介"
              value={draft.description}
              onChange={(v) => patch("description", v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="资源池"
                value={draft.resources}
                onChange={(v) => patch("resources", v)}
              />
              <Field
                label="出口 IP"
                value={draft.exitIp}
                onChange={(v) => patch("exitIp", v)}
              />
            </div>
            <Field
              label="IP 更换策略"
              value={draft.ipChanges}
              onChange={(v) => patch("ipChanges", v)}
            />
            <Field
              label="支持范围 / 服务说明"
              value={draft.support}
              onChange={(v) => patch("support", v)}
            />
            <label className="block space-y-1.5 text-sm text-[var(--color-text-muted)]">
              <span>卡片特性列表（每行一条）</span>
              <textarea
                className={inputClass}
                rows={3}
                value={draft.marketingFeatures}
                onChange={(e) => patch("marketingFeatures", e.target.value)}
                placeholder="例如：30 GB 流量/月"
              />
            </label>
          </Section>
          <Section title="Stripe 价格映射">
            <Field
              label="Stripe Price ID"
              value={draft.stripePriceId}
              onChange={(v) => patch("stripePriceId", v)}
            />
          </Section>
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
