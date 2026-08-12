"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { WorkbenchProjection } from "@/lib/xworkmate/workbenchProjection";
import { cn } from "@/lib/utils";

export type AnalyticsRange = "7d" | "30d" | "all";

export type ModelUsage = {
  name: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  share: number;
};

export type ModelUsageDay = {
  date: string;
  models: Record<string, number>;
};

export type ActivityDay = {
  date: string;
  count: number;
};

export type AnalyticsDashboard = {
  summary: {
    sessions?: number;
    messages?: number;
    totalTokens?: number;
    activeDays?: number;
    currentStreak?: number;
    longestStreak?: number;
    peakHour?: string;
    favoriteModel?: string;
  };
  activity: ActivityDay[];
  models: ModelUsage[];
  modelUsageByDay: ModelUsageDay[];
};

type AnalyticsTab = "overview" | "models";

const ranges: Array<{ value: AnalyticsRange; label: string }> = [
  { value: "all", label: "全部" },
  { value: "30d", label: "30日" },
  { value: "7d", label: "7日" },
];

const modelColors = [
  "#3f7ddd",
  "#5d91df",
  "#76a3e2",
  "#91b5e7",
  "#aac7ed",
  "#c5daf3",
];

export function normalizeAnalyticsDashboard(
  payload: unknown,
): AnalyticsDashboard | null {
  if (!isRecord(payload)) return null;
  const source = isRecord(payload.insights) ? payload.insights : payload;
  const summary = isRecord(source.summary) ? source.summary : source;
  return {
    summary: {
      sessions: optionalNumber(summary.sessions),
      messages: optionalNumber(summary.messages),
      totalTokens: optionalNumber(summary.totalTokens),
      activeDays: optionalNumber(summary.activeDays),
      currentStreak: optionalNumber(summary.currentStreak),
      longestStreak: optionalNumber(summary.longestStreak),
      peakHour: optionalString(summary.peakHour),
      favoriteModel: optionalString(summary.favoriteModel),
    },
    activity: normalizeActivity(source.activity),
    models: normalizeModels(source.models),
    modelUsageByDay: normalizeModelUsageByDay(source.modelUsageByDay),
  };
}

export function AiWorkspaceAnalyticsPanel({
  projection,
  dashboard,
}: {
  projection: WorkbenchProjection;
  dashboard: AnalyticsDashboard | null;
}) {
  const [tab, setTab] = useState<AnalyticsTab>("overview");
  const [range, setRange] = useState<AnalyticsRange>("all");
  const activity = useMemo(
    () => buildActivityCalendar(projection, dashboard, range),
    [dashboard, projection, range],
  );
  const modelRows = useMemo(
    () => filterModels(dashboard?.models ?? [], range),
    [dashboard, range],
  );
  const dailyModelUsage = useMemo(
    () => filterByRange(dashboard?.modelUsageByDay ?? [], range, (item) => item.date),
    [dashboard, range],
  );

  const summary = dashboard?.summary ?? {};
  const messageCount = projection.items.reduce(
    (total, item) => total + item.messageCount,
    0,
  );
  const derivedActiveDays = activity.filter((day) => day.count > 0).length;
  const metrics = [
    ["Sessions", formatInteger(summary.sessions ?? projection.items.length)],
    ["Messages", formatInteger(summary.messages ?? messageCount)],
    ["Total tokens", formatTokens(summary.totalTokens)],
    ["Active days", formatInteger(summary.activeDays ?? derivedActiveDays)],
    ["Current streak", formatDays(summary.currentStreak)],
    ["Longest streak", formatDays(summary.longestStreak)],
    ["Peak hour", summary.peakHour ?? "—"],
    ["Favorite model", summary.favoriteModel ?? modelRows[0]?.name ?? "—"],
  ] as const;

  return (
    <section
      data-testid="workspace-analytics-panel"
      className="rounded-[18px] border border-slate-200/80 bg-[#f3f3f2] p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1" role="tablist" aria-label="工作台分析视图">
          <AnalyticsTabButton active={tab === "overview"} onClick={() => setTab("overview")}>Overview</AnalyticsTabButton>
          <AnalyticsTabButton active={tab === "models"} onClick={() => setTab("models")}>Models</AnalyticsTabButton>
        </div>
        <div className="ml-auto flex items-center gap-1" role="group" aria-label="统计时间范围">
          {ranges.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={range === item.value}
              onClick={() => setRange(item.value)}
              className={cn(
                "rounded-[9px] px-2.5 py-1.5 text-xs font-semibold transition",
                range === item.value
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-stone-500 hover:text-slate-800",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" ? (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {metrics.map(([label, value]) => (
              <div key={label} className="min-h-[82px] rounded-[10px] bg-[#e4e4e3] px-3 py-2.5">
                <div className="text-sm font-medium text-stone-500">{label}</div>
                <div className="mt-2 text-lg font-bold tracking-[-0.02em] text-slate-950">{value}</div>
              </div>
            ))}
          </div>
          <ActivityTable days={activity} />
        </div>
      ) : (
        <ModelsTable
          models={modelRows}
          dailyUsage={dailyModelUsage}
        />
      )}
    </section>
  );
}

function AnalyticsTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-[9px] px-2.5 py-1.5 text-sm font-medium transition",
        active ? "bg-[#e4e4e3] text-black" : "text-stone-500 hover:text-slate-800",
      )}
    >
      {children}
    </button>
  );
}

function ActivityTable({ days }: { days: ActivityDay[] }) {
  const weeks = groupIntoWeeks(days);
  const maximum = Math.max(1, ...days.map((day) => day.count));
  const monthLabels = buildMonthLabels(weeks);
  return (
    <div className="mt-3 overflow-x-auto rounded-[10px] bg-white/40 p-3">
      <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-1" aria-label="年度工作活跃度">
        <thead>
          <tr>
            <th className="w-8" />
            {weeks.map((week, index) => (
              <th key={week[0]?.date ?? index} className="h-5 text-left text-[10px] font-medium text-stone-500">
                {monthLabels.get(index) ?? ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 7 }, (_, weekday) => (
            <tr key={weekday}>
              <th className="pr-1 text-right text-[10px] font-medium text-stone-500">
                {weekday === 1 ? "Mon" : weekday === 3 ? "Wed" : weekday === 5 ? "Fri" : ""}
              </th>
              {weeks.map((week, weekIndex) => {
                const day = week[weekday];
                return (
                  <td key={`${weekIndex}-${weekday}`} className="p-0.5">
                    <div
                      title={day ? `${day.date}：${day.count} 项活动` : ""}
                      className="aspect-square w-full rounded-[3px] border border-slate-200/70"
                      style={{ backgroundColor: day ? activityColor(day.count, maximum) : "transparent" }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-stone-500">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span key={level} className="h-3 w-3 rounded-[3px] border border-slate-200/70" style={{ backgroundColor: activityColor(level, 4) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function ModelsTable({
  models,
  dailyUsage,
}: {
  models: ModelUsage[];
  dailyUsage: ModelUsageDay[];
}) {
  const chartData = dailyUsage.map((day) => ({ date: shortDate(day.date), ...day.models }));
  return (
    <div className="mt-4">
      <div className="h-[250px] rounded-[10px] bg-white/35 p-3">
        {chartData.length > 0 && models.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#dedede" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#666" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#666" }} tickFormatter={formatTokens} />
              <Tooltip formatter={(value) => formatTokens(Number(value ?? 0))} />
              {models.slice(0, 6).map((model, index) => (
                <Bar key={model.name} dataKey={model.name} stackId="models" fill={modelColors[index]} radius={index === models.length - 1 ? [3, 3, 0, 0] : 0} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-stone-500">服务端暂无模型日用量数据</div>
        )}
      </div>
      <div className="mt-3 overflow-x-auto rounded-[10px] bg-white/40">
        <table className="w-full min-w-[680px] text-left text-sm" aria-label="模型用量明细">
          <thead className="border-b border-stone-300/70 text-xs font-medium text-stone-500">
            <tr>
              <th className="px-3 py-2.5">模型</th>
              <th className="px-3 py-2.5 text-right">输入 Tokens</th>
              <th className="px-3 py-2.5 text-right">输出 Tokens</th>
              <th className="px-3 py-2.5 text-right">总量</th>
              <th className="px-3 py-2.5 text-right">占比</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200/80">
            {models.length > 0 ? (
              models.map((model, index) => (
                <tr key={model.name}>
                  <td className="px-3 py-2.5 font-medium text-slate-900">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: modelColors[index % modelColors.length] }} />
                    {model.name}
                  </td>
                  <td className="px-3 py-2.5 text-right text-stone-500">{formatTokens(model.inputTokens)}</td>
                  <td className="px-3 py-2.5 text-right text-stone-500">{formatTokens(model.outputTokens)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-800">{formatTokens(model.totalTokens)}</td>
                  <td className="px-3 py-2.5 text-right font-medium text-slate-950">{model.share.toFixed(1)}%</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="px-3 py-10 text-center text-stone-500">服务端暂无模型用量明细</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildActivityCalendar(
  projection: WorkbenchProjection,
  dashboard: AnalyticsDashboard | null,
  range: AnalyticsRange,
): ActivityDay[] {
  const countByDate = new Map<string, number>();
  for (const day of dashboard?.activity ?? []) countByDate.set(day.date, day.count);
  if (countByDate.size === 0) {
    for (const item of projection.items) {
      if (!item.updatedAtMs) continue;
      const key = localDateKey(new Date(item.updatedAtMs));
      countByDate.set(key, (countByDate.get(key) ?? 0) + 1);
    }
  }
  const totalDays = range === "7d" ? 7 : range === "30d" ? 30 : 364;
  const today = startOfDay(new Date());
  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (totalDays - 1 - index));
    const key = localDateKey(date);
    return { date: key, count: countByDate.get(key) ?? 0 };
  });
}

function groupIntoWeeks(days: ActivityDay[]): Array<Array<ActivityDay | undefined>> {
  if (days.length === 0) return [];
  const leading = new Date(`${days[0].date}T00:00:00`).getDay();
  const cells: Array<ActivityDay | undefined> = [...Array(leading).fill(undefined), ...days];
  while (cells.length % 7 !== 0) cells.push(undefined);
  return Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7));
}

function buildMonthLabels(weeks: Array<Array<ActivityDay | undefined>>) {
  const labels = new Map<number, string>();
  let lastMonth = -1;
  weeks.forEach((week, index) => {
    const day = week.find(Boolean);
    if (!day) return;
    const month = new Date(`${day.date}T00:00:00`).getMonth();
    if (month !== lastMonth) labels.set(index, `${month + 1}月`);
    lastMonth = month;
  });
  return labels;
}

function filterModels(models: ModelUsage[], _range: AnalyticsRange) {
  return [...models].sort((left, right) => right.totalTokens - left.totalTokens);
}

function filterByRange<T>(items: T[], range: AnalyticsRange, date: (item: T) => string) {
  if (range === "all") return items;
  const cutoff = startOfDay(new Date());
  cutoff.setDate(cutoff.getDate() - (range === "7d" ? 6 : 29));
  return items.filter((item) => new Date(`${date(item)}T00:00:00`) >= cutoff);
}

function normalizeActivity(value: unknown): ActivityDay[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const date = optionalString(item.date);
    const count = optionalNumber(item.count);
    return date && count !== undefined ? [{ date, count }] : [];
  });
}

function normalizeModels(value: unknown): ModelUsage[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const name = optionalString(item.name);
    if (!name) return [];
    const inputTokens = optionalNumber(item.inputTokens) ?? 0;
    const outputTokens = optionalNumber(item.outputTokens) ?? 0;
    return [{
      name,
      inputTokens,
      outputTokens,
      totalTokens: optionalNumber(item.totalTokens) ?? inputTokens + outputTokens,
      share: optionalNumber(item.share) ?? 0,
    }];
  });
}

function normalizeModelUsageByDay(value: unknown): ModelUsageDay[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || !isRecord(item.models)) return [];
    const date = optionalString(item.date);
    if (!date) return [];
    const models = Object.fromEntries(
      Object.entries(item.models).flatMap(([name, amount]) => {
        const normalized = optionalNumber(amount);
        return normalized === undefined ? [] : [[name, normalized]];
      }),
    );
    return [{ date, models }];
  });
}

function activityColor(value: number, maximum: number) {
  if (value <= 0) return "#e9edf2";
  const level = Math.min(4, Math.max(1, Math.ceil((value / maximum) * 4)));
  return ["#e9edf2", "#c5daf3", "#8eb5e8", "#5791dd", "#266dcc"][level];
}

function formatInteger(value: number | undefined) {
  return value === undefined ? "—" : new Intl.NumberFormat("en-US").format(value);
}

function formatTokens(value: number | undefined) {
  if (value === undefined) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function formatDays(value: number | undefined) {
  return value === undefined ? "—" : `${value}d`;
}

function shortDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function localDateKey(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
