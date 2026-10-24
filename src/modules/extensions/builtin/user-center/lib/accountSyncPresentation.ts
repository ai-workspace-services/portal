import type { AccountPolicy, AccountUsageSummary } from "./fetchAccountUsage";

export function accountSyncPresentation(
  usage: AccountUsageSummary | undefined,
  policy: AccountPolicy | null | undefined,
  zh: boolean,
  now = Date.now(),
) {
  const hasBucket = Boolean(
    usage?.lastBucketAt && Number.isFinite(Date.parse(usage.lastBucketAt)),
  );
  const delay = usage?.syncDelaySeconds;
  const delayLabel = !usage
    ? "—"
    : !hasBucket
      ? zh
        ? "暂无采集记录"
        : "No collected usage"
      : typeof delay === "number" && Number.isFinite(delay) && delay >= 0
        ? `~${delay} s`
        : "—";
  const groupsLabel =
    policy?.eligibleNodeGroups?.join(", ") ||
    (policy === null ? (zh ? "未生成" : "Not generated") : "—");
  const result = (
    label: string,
    tone: "neutral" | "warning" | "danger" | "success",
  ) => ({ label, tone, delayLabel, groupsLabel });
  if (!usage) return result(zh ? "数据未就绪" : "Data unavailable", "neutral");
  if (usage.networkAccessReason === "quota_exhausted")
    return result(
      zh ? "额度已用尽 · 已暂停" : "Quota exhausted · Paused",
      "danger",
    );
  if (usage.networkAccessReason === "billing_suspended")
    return result(zh ? "账务暂停" : "Billing suspended", "danger");
  if (usage.networkAccessReason === "operator_paused")
    return result(zh ? "管理员暂停" : "Operator paused", "danger");
  if (usage.arrears) return result(zh ? "欠费" : "Arrears", "danger");
  if (
    usage.networkAccessState === "paused" ||
    usage.networkAccessState === "blocked"
  )
    return result(zh ? "访问已暂停" : "Access paused", "danger");
  if (policy === null)
    return result(zh ? "策略未生成" : "Policy not generated", "warning");
  if (!policy)
    return result(zh ? "策略状态未知" : "Policy unavailable", "warning");
  const expires = policy.expiresAt ? Date.parse(policy.expiresAt) : NaN;
  if (!Number.isFinite(expires))
    return result(zh ? "策略时间未知" : "Policy expiry unavailable", "warning");
  if (expires <= now)
    return result(zh ? "策略已过期" : "Policy expired", "warning");
  if (!hasBucket)
    return result(zh ? "等待采集" : "Awaiting collection", "warning");
  if (
    usage.networkAccessState !== "active" ||
    typeof delay !== "number" ||
    !Number.isFinite(delay) ||
    delay < 0
  )
    return result(zh ? "同步状态未知" : "Sync unavailable", "warning");
  return result(zh ? "正常" : "Normal", "success");
}
