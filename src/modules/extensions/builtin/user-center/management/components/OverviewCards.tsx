"use client";

export type MetricsOverview = {
  totalUsers: number;
  activeUsers: number;
  subscribedUsers: number;
  newUsersLast24h: number;
};

type OverviewCardsProps = {
  overview?: MetricsOverview;
  isLoading?: boolean;
  lastUpdatedLabel?: string;
  errorMessage?: string;
  onRetry?: () => void;
};

const METRIC_ITEMS: Array<{
  key: keyof MetricsOverview;
  label: string;
  helper?: string;
}> = [
  { key: "totalUsers", label: "注册用户" },
  { key: "subscribedUsers", label: "订阅用户" },
  { key: "activeUsers", label: "活跃用户" },
  {
    key: "newUsersLast24h",
    label: "近 24 小时新增",
    helper: "包含注册与导入用户",
  },
];

export function OverviewCards({
  overview,
  isLoading = false,
  lastUpdatedLabel,
  errorMessage,
  onRetry,
}: OverviewCardsProps) {
  return (
    <div>
      <dl
        className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${
          isLoading ? "animate-pulse opacity-80" : ""
        }`}
        aria-live="polite"
        aria-busy={isLoading}
      >
        {METRIC_ITEMS.map(({ key, label, helper }) => {
          const value = overview?.[key];
          return (
            <div
              key={key}
              className="rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-primary-border)]"
            >
              <dt className="text-sm font-medium text-[var(--color-text-muted)]">
                {label}
              </dt>
              <dd className="mt-2 text-2xl font-semibold text-[var(--color-heading)]">
                {isLoading ? (
                  <span className="inline-block h-6 w-20 rounded bg-[var(--color-surface-muted)]" />
                ) : (
                  (value ?? "—")
                )}
              </dd>
              {helper ? (
                <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                  {helper}
                </p>
              ) : null}
            </div>
          );
        })}
      </dl>
      {errorMessage ? (
        <div
          role="alert"
          className="mt-3 flex items-center gap-3 text-sm text-[var(--color-danger)]"
        >
          <span>用户统计加载失败：{errorMessage}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              disabled={isLoading}
              className="underline"
            >
              重试
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default OverviewCards;
