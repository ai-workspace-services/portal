"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Edit3,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { useUserStore } from "@lib/userStore";

import { ADMIN_API_BASE } from "../../lib/adminApi";

type BillingPlan = {
  planId: string;
  stripePriceId?: string;
  displayName?: string;
  kind: "trial" | "subscription" | "paygo_topup" | string;
  includedQuotaBytes?: number;
  packageName?: string;
  priceMultipliers?: Record<string, number>;
  features?: Record<string, unknown>;
  trialDays?: number;
  active?: boolean;
  sortOrder?: number;
};

type PlansResponse = { plans?: BillingPlan[] };
type PlanForm = {
  planId: string;
  displayName: string;
  kind: string;
  packageName: string;
  stripePriceId: string;
  includedQuotaBytes: string;
  trialDays: string;
  sortOrder: string;
  active: boolean;
  reason: string;
};

const surface =
  "rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)]";

async function fetcher<T>(input: RequestInfo): Promise<T> {
  const response = await fetch(input, {
    credentials: "include",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      (payload as { error?: string } | null)?.error ?? "加载失败",
    );
  }
  return payload as T;
}

function formatBytes(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "—";
  if (value === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function kindLabel(kind: string) {
  return (
    {
      trial: "试用",
      subscription: "订阅",
      paygo_topup: "PAYG 充值",
    }[kind] ?? kind
  );
}

function emptyForm(plan?: BillingPlan): PlanForm {
  return {
    planId: plan?.planId ?? "",
    displayName: plan?.displayName ?? "",
    kind: plan?.kind ?? "subscription",
    packageName: plan?.packageName ?? "default",
    stripePriceId: plan?.stripePriceId ?? "",
    includedQuotaBytes:
      plan?.includedQuotaBytes === undefined
        ? "0"
        : String(plan.includedQuotaBytes),
    trialDays: plan?.trialDays === undefined ? "0" : String(plan.trialDays),
    sortOrder: plan?.sortOrder === undefined ? "0" : String(plan.sortOrder),
    active: plan?.active ?? true,
    reason: "",
  };
}

export default function OpsPlanCatalog() {
  const user = useUserStore((state) => state.user);
  const plansSWR = useSWR<PlansResponse>(`${ADMIN_API_BASE}/billing/plans`, fetcher, {
    revalidateOnFocus: false,
  });
  const [editing, setEditing] = useState<BillingPlan | null | undefined>();
  const [form, setForm] = useState<PlanForm>(() => emptyForm());
  const [status, setStatus] = useState<string>();
  const [error, setError] = useState<string>();
  const [deleting, setDeleting] = useState<BillingPlan>();
  const [deleteReason, setDeleteReason] = useState("");
  const plans = useMemo(
    () =>
      [...(plansSWR.data?.plans ?? [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [plansSWR.data?.plans],
  );
  const canWrite = Boolean(
    user?.isAdmin ||
    user?.permissions.includes("*") ||
    user?.permissions.includes("admin.billing.money.write"),
  );

  const openEditor = (plan?: BillingPlan) => {
    setEditing(plan ?? null);
    setForm(emptyForm(plan));
    setStatus(undefined);
    setError(undefined);
  };

  const updateForm = <K extends keyof PlanForm>(key: K, value: PlanForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const savePlan = async () => {
    if (!form.planId.trim() || !form.displayName.trim()) {
      setError("请填写套餐 ID 和显示名称。");
      return;
    }
    if (!form.reason.trim()) {
      setError("请填写操作原因，发布或下架会写入审计流水。");
      return;
    }
    const includedQuotaBytes = Number(form.includedQuotaBytes);
    const trialDays = Number(form.trialDays);
    const sortOrder = Number(form.sortOrder);
    if (
      ![includedQuotaBytes, trialDays, sortOrder].every(Number.isFinite) ||
      includedQuotaBytes < 0 ||
      trialDays < 0
    ) {
      setError("配额、试用天数和排序必须是有效的非负数字。");
      return;
    }
    if (
      form.stripePriceId.trim() &&
      !form.stripePriceId.trim().startsWith("price_")
    ) {
      setError(
        "Stripe Price ID 应以 price_ 开头；金额请在 Stripe 管理，不在此页面伪造。",
      );
      return;
    }
    if (
      !window.confirm(
        `${form.active ? "发布" : "下架"}套餐 ${form.planId.trim()}？将影响 /prices 展示与购买入口。`,
      )
    )
      return;

    setStatus("保存中…");
    setError(undefined);
    try {
      const response = await fetch(
        `${ADMIN_API_BASE}/billing/plans/${encodeURIComponent(form.planId.trim())}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            planId: form.planId.trim(),
            displayName: form.displayName.trim(),
            kind: form.kind,
            packageName: form.packageName.trim() || "default",
            stripePriceId: form.stripePriceId.trim(),
            includedQuotaBytes,
            trialDays,
            sortOrder,
            active: form.active,
            reason: form.reason.trim(),
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          (payload as { error?: string } | null)?.error ?? "保存失败",
        );
      setStatus("已保存，审计记录已写入。");
      await plansSWR.mutate();
      window.setTimeout(() => setEditing(undefined), 700);
    } catch (saveError) {
      setStatus(undefined);
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    }
  };

  const deletePlan = async () => {
    if (!deleting) return;
    if (!deleteReason.trim()) {
      setError("删除套餐必须填写原因。");
      return;
    }
    if (
      !window.confirm(
        `确认永久删除套餐 ${deleting.planId}？已有订阅可能仍引用它。`,
      )
    )
      return;
    setStatus("删除中…");
    setError(undefined);
    try {
      const query = new URLSearchParams({ reason: deleteReason.trim() });
      const response = await fetch(
        `${ADMIN_API_BASE}/billing/plans/${encodeURIComponent(deleting.planId)}?${query}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(
          (payload as { error?: string } | null)?.error ?? "删除失败",
        );
      setDeleting(undefined);
      setDeleteReason("");
      setStatus(undefined);
      await plansSWR.mutate();
    } catch (deleteError) {
      setStatus(undefined);
      setError(deleteError instanceof Error ? deleteError.message : "删除失败");
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
            Operations / plan catalog
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-heading)] sm:text-3xl">
            套餐与订阅
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            管理 /prices 使用的套餐目录、权益和发布状态。
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={() => openEditor()}
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            新建套餐
          </button>
        ) : (
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-surface-border)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
            <ShieldCheck className="h-3.5 w-3.5" />
            只读查看
          </span>
        )}
      </div>
      <OpsPlanNavigation />
      <section className={`${surface} flex items-start gap-3 p-4`}>
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" />
        <div className="text-sm text-[var(--color-text-muted)]">
          <p className="font-medium text-[var(--color-heading)]">发布边界</p>
          <p className="mt-1">
            此目录会影响公开价格页和购买入口。金额由 Stripe Price ID
            对应，页面不直接伪造金额；发布、下架和删除均要求原因并写入审计。
          </p>
        </div>
      </section>
      <section className={`${surface} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-heading)]">
              套餐目录
            </h2>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              {plans.length} 个套餐 · 包含已下架项
            </p>
          </div>
          <button
            type="button"
            onClick={() => plansSWR.mutate()}
            aria-label="刷新套餐目录"
            className="rounded-lg p-2 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)]"
          >
            <RefreshCw
              className={`h-4 w-4 ${plansSWR.isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        {plansSWR.error ? (
          <div className="p-8 text-center text-sm text-[var(--color-danger)]">
            套餐目录加载失败：{plansSWR.error.message}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <caption className="sr-only">套餐目录</caption>
              <thead className="bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-5 py-3 font-medium">套餐</th>
                  <th className="px-3 py-3 font-medium">类型</th>
                  <th className="px-3 py-3 font-medium">权益配额</th>
                  <th className="px-3 py-3 font-medium">Stripe Price ID</th>
                  <th className="px-3 py-3 font-medium">状态</th>
                  <th className="px-5 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-surface-border)]">
                {plansSWR.isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-[var(--color-text-subtle)]"
                    >
                      目录加载中…
                    </td>
                  </tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center text-sm text-[var(--color-text-subtle)]"
                    >
                      暂无套餐，请先新建套餐。
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr
                      key={plan.planId}
                      className="hover:bg-[var(--color-surface-muted)]/60"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[var(--color-heading)]">
                          {plan.displayName || plan.planId}
                        </p>
                        <p className="mt-1 font-mono text-xs text-[var(--color-text-subtle)]">
                          {plan.planId} · {plan.packageName || "default"}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <span className="rounded-full border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)] px-2 py-1 text-xs text-[var(--color-primary)]">
                          {kindLabel(plan.kind)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-[var(--color-text-muted)]">
                        {formatBytes(plan.includedQuotaBytes)}
                        {plan.trialDays ? (
                          <span className="ml-2 text-xs text-[var(--color-text-subtle)]">
                            试用 {plan.trialDays} 天
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-4 font-mono text-xs text-[var(--color-text-muted)]">
                        {plan.stripePriceId || "未配置 · 待同步"}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${plan.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                        >
                          {plan.active ? "已发布" : "已下架"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {canWrite ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditor(plan)}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-muted)]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              编辑
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleting(plan);
                                setDeleteReason("");
                                setError(undefined);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-muted)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              删除
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-subtle)]">
                            无写权限
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {editing !== undefined ? (
        <PlanEditor
          form={form}
          editing={editing}
          status={status}
          error={error}
          onChange={updateForm}
          onClose={() => setEditing(undefined)}
          onSubmit={savePlan}
        />
      ) : null}
      {deleting ? (
        <DeleteDialog
          plan={deleting}
          reason={deleteReason}
          status={status}
          error={error}
          onReasonChange={setDeleteReason}
          onClose={() => setDeleting(undefined)}
          onSubmit={deletePlan}
        />
      ) : null}
      {status && !editing && !deleting ? (
        <p
          className="rounded-lg bg-[var(--color-success-muted)] px-3 py-2 text-sm text-[var(--color-success-foreground)]"
          role="status"
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}

function OpsPlanNavigation() {
  return (
    <nav
      className="flex gap-1 overflow-x-auto rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-1"
      aria-label="运营模块"
    >
      <Link
        href="/panel/ops"
        className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-heading)]"
      >
        运营工作台 <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <Link
        href="/panel/ops/accounts"
        className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-heading)]"
      >
        账号处置台
      </Link>
      <span className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-primary)] shadow-sm">
        <Package className="h-4 w-4" />
        套餐与订阅
      </span>
      <Link
        href="/panel/ops/billing/ledger"
        className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-heading)]"
      >
        账单与对账
      </Link>
      <Link
        href="/panel/ops/audit"
        className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-heading)]"
      >
        审计与系统
      </Link>
    </nav>
  );
}

function PlanEditor({
  form,
  editing,
  status,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  form: PlanForm;
  editing: BillingPlan | null;
  status?: string;
  error?: string;
  onChange: <K extends keyof PlanForm>(key: K, value: PlanForm[K]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-editor-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="plan-editor-title"
              className="text-lg font-semibold text-[var(--color-heading)]"
            >
              {editing ? "编辑套餐" : "新建套餐"}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              金额不在此编辑，保存后会影响公开价格目录。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-lg p-2 text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="套餐 ID *"
            value={form.planId}
            disabled={Boolean(editing)}
            onChange={(value) => onChange("planId", value)}
            placeholder="PRO-MONTHLY"
          />
          <Field
            label="显示名称 *"
            value={form.displayName}
            onChange={(value) => onChange("displayName", value)}
            placeholder="Pro 月付"
          />
          <Field
            label="套餐类型"
            value={form.kind}
            select
            options={[
              ["subscription", "订阅"],
              ["trial", "试用"],
              ["paygo_topup", "PAYG 充值"],
            ]}
            onChange={(value) => onChange("kind", value)}
          />
          <Field
            label="内部包名"
            value={form.packageName}
            onChange={(value) => onChange("packageName", value)}
            placeholder="pro"
          />
          <Field
            label="Stripe Price ID"
            value={form.stripePriceId}
            onChange={(value) => onChange("stripePriceId", value)}
            placeholder="price_...（可暂不配置）"
          />
          <Field
            label="包含配额（字节）"
            value={form.includedQuotaBytes}
            onChange={(value) => onChange("includedQuotaBytes", value)}
            placeholder="0"
            type="number"
          />
          <Field
            label="试用天数"
            value={form.trialDays}
            onChange={(value) => onChange("trialDays", value)}
            placeholder="0"
            type="number"
          />
          <Field
            label="排序"
            value={form.sortOrder}
            onChange={(value) => onChange("sortOrder", value)}
            placeholder="0"
            type="number"
          />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => onChange("active", event.target.checked)}
            className="h-4 w-4 accent-[var(--color-primary)]"
          />
          发布到 /prices（取消勾选即下架）
        </label>
        <label className="mt-4 block text-sm font-medium text-[var(--color-text-muted)]">
          操作原因 <span className="text-[var(--color-danger)]">*</span>
          <textarea
            value={form.reason}
            onChange={(event) => onChange("reason", event.target.value)}
            rows={3}
            placeholder="填写工单号、业务背景或回滚原因"
            className="mt-1 w-full resize-none rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-heading)] outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        {error ? (
          <p
            className="mt-3 rounded-lg bg-[var(--color-danger-muted)] px-3 py-2 text-sm text-[var(--color-danger-foreground)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {status ? (
          <p
            className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--color-success-muted)] px-3 py-2 text-sm text-[var(--color-success-foreground)]"
            role="status"
          >
            <Check className="h-4 w-4" />
            {status}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={Boolean(status)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {status === "保存中…" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {status === "保存中…" ? "保存中…" : "确认保存"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  select = false,
  options = [],
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  select?: boolean;
  options?: string[][];
}) {
  const className =
    "mt-1 w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-heading)] outline-none focus:border-[var(--color-primary)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)]";
  return (
    <label className="block text-sm font-medium text-[var(--color-text-muted)]">
      {label}
      {select ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className={className}
        >
          {options.map(([option, labelText]) => (
            <option key={option} value={option}>
              {labelText}
            </option>
          ))}
        </select>
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          disabled={disabled}
          className={className}
        />
      )}
    </label>
  );
}

function DeleteDialog({
  plan,
  reason,
  status,
  error,
  onReasonChange,
  onClose,
  onSubmit,
}: {
  plan: BillingPlan;
  reason: string;
  status?: string;
  error?: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4"
      role="presentation"
    >
      <section
        className="w-full max-w-lg rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-plan-title"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2
              id="delete-plan-title"
              className="text-lg font-semibold text-[var(--color-heading)]"
            >
              删除套餐
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {plan.planId} · {plan.displayName || "未命名"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="rounded-lg p-2 text-[var(--color-text-subtle)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 rounded-lg bg-[var(--color-danger-muted)] p-3 text-sm text-[var(--color-danger-foreground)]">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          已有订阅可能引用此套餐，日常下架请优先编辑并取消发布。
        </div>
        <label className="mt-4 block text-sm font-medium text-[var(--color-text-muted)]">
          删除原因 <span className="text-[var(--color-danger)]">*</span>
          <textarea
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={3}
            className="mt-1 w-full resize-none rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-heading)] outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        {error ? (
          <p
            className="mt-3 rounded-lg bg-[var(--color-danger-muted)] px-3 py-2 text-sm text-[var(--color-danger-foreground)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {status ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            {status}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[color:var(--color-surface-border)] px-4 py-2 text-sm font-medium text-[var(--color-text-muted)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={Boolean(status)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-danger)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" />
            确认删除
          </button>
        </div>
      </section>
    </div>
  );
}
