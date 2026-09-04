"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarDays,
  ChevronDown,
  Download,
  FileUp,
  Search,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

import Card from "../../components/Card";

export type ManagedUser = {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role?: string;
  groups?: string[];
  active?: boolean;
  created_at?: string;
};
export type CreateManagedUserInput = {
  email: string;
  uuid: string;
  groups: string[];
};

type Props = {
  users?: ManagedUser[];
  isLoading?: boolean;
  pendingUserIds?: Set<string>;
  canEditRoles: boolean;
  canCreateCustomUser?: boolean;
  onRoleChange?: (userId: string, role: string) => void;
  onPauseUser?: (userId: string) => void;
  onResumeUser?: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onRenewUuid?: (userId: string) => void;
  onManageBlacklist?: () => void;
  onCreateCustomUser?: (input: CreateManagedUserInput) => Promise<void> | void;
  onGroupsChange?: (userId: string, groups: string[]) => void;
  pendingGroupUserIds?: Set<string>;
};
type SegmentId =
  | "free"
  | "subscribed"
  | "payg"
  | "monthly"
  | "yearly"
  | "internal";
type Segment = {
  id: SegmentId;
  label: string;
  value: string;
  parent?: SegmentId;
  description: string;
};

const SEGMENTS: Segment[] = [
  {
    id: "free",
    label: "Free 用户",
    value: "segment:free",
    description: "免费使用基础功能的用户",
  },
  {
    id: "subscribed",
    label: "订阅用户",
    value: "segment:subscribed",
    description: "付费订阅产品的用户",
  },
  {
    id: "payg",
    label: "Pay as you go",
    value: "segment:subscription:payg",
    parent: "subscribed",
    description: "按量计费用户",
  },
  {
    id: "monthly",
    label: "月付",
    value: "segment:subscription:monthly",
    parent: "subscribed",
    description: "月度订阅用户",
  },
  {
    id: "yearly",
    label: "年付",
    value: "segment:subscription:yearly",
    parent: "subscribed",
    description: "年度订阅用户",
  },
  {
    id: "internal",
    label: "内部用户",
    value: "segment:internal",
    description: "公司内部员工及协作者",
  },
];
const LEGACY: Record<SegmentId, string[]> = {
  free: ["segment:registered"],
  subscribed: ["segment:subscribed"],
  payg: ["segment:payg"],
  monthly: ["segment:monthly"],
  yearly: ["segment:yearly"],
  internal: ["segment:operations", "segment:beta"],
};

const parseGroupList = (input: string): string[] =>
  Array.from(
    new Set(
      input
        .split(/[\n,，]/)
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
const nameOf = (user: ManagedUser): string =>
  user.username?.trim() || user.name?.trim() || user.email?.trim() || "—";
const hasSegment = (user: ManagedUser, segment: Segment): boolean =>
  (user.groups ?? []).includes(segment.value) ||
  LEGACY[segment.id].some((value) => (user.groups ?? []).includes(value));
const primarySegment = (user: ManagedUser): Segment =>
  SEGMENTS.find((segment) => segment.parent && hasSegment(user, segment)) ??
  SEGMENTS.find((segment) => hasSegment(user, segment)) ??
  SEGMENTS[0];
const formatDate = (value?: string): string =>
  value ? new Date(value).toLocaleDateString("zh-CN") : "—";

function Donut({ automatic, manual }: { automatic: number; manual: number }) {
  const percent = Math.round((automatic / (automatic + manual || 1)) * 100);
  return (
    <div
      className="flex items-center gap-3"
      aria-label={`自动分配 ${percent}%，手动覆盖 ${100 - percent}%`}
    >
      <div
        className="grid h-20 w-20 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--color-primary) 0 ${percent}%, #d8b4fe ${percent}% 100%)`,
        }}
      >
        <div className="grid h-14 w-14 place-items-center rounded-full bg-white text-center">
          <span className="text-sm font-semibold text-[var(--color-heading)]">
            {percent}%
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">
            自动
          </span>
        </div>
      </div>
      <div className="space-y-1 text-xs text-[var(--color-text-muted)]">
        <p>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--color-primary)]" />
          自动（规则）{automatic}
        </p>
        <p>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-purple-300" />
          手动覆盖 {manual}
        </p>
      </div>
    </div>
  );
}

export function UserGroupManagement({
  users,
  isLoading = false,
  canEditRoles,
  canCreateCustomUser = false,
  onManageBlacklist,
  onCreateCustomUser,
  onGroupsChange,
  pendingGroupUserIds,
}: Props) {
  const data = useMemo(() => users ?? [], [users]);
  const pending = pendingGroupUserIds ?? new Set<string>();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [segmentId, setSegmentId] = useState<SegmentId>("subscribed");
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"all" | "manual" | "automatic">("all");
  const [override, setOverride] = useState(true);
  const [validFrom, setValidFrom] = useState("2026-09-04");
  const [validUntil, setValidUntil] = useState("2026-10-04");
  const [benefit, setBenefit] = useState("高级版套餐");
  const [email, setEmail] = useState("");
  const [uuid, setUuid] = useState("");
  const [groups, setGroups] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [createError, setCreateError] = useState<string>();

  const segment = SEGMENTS.find((item) => item.id === segmentId) ?? SEGMENTS[0];
  const members = useMemo(
    () => data.filter((user) => hasSegment(user, segment)),
    [data, segment],
  );
  const visibleUsers = useMemo(
    () =>
      members.filter((user) => {
        const matched =
          !query.trim() ||
          [user.email, user.username, user.name, user.id]
            .filter(Boolean)
            .some((value) =>
              value?.toLowerCase().includes(query.trim().toLowerCase()),
            );
        const isManual = (user.groups ?? []).some((group) =>
          group.startsWith("segment:"),
        );
        return (
          matched &&
          (source === "all" || (source === "manual" ? isManual : !isManual))
        );
      }),
    [members, query, source],
  );
  const selectedUser =
    data.find((user) => user.id === selectedUserId) ?? visibleUsers[0];
  const automatic = members.filter(
    (user) =>
      !(user.groups ?? []).some((group) => group.startsWith("segment:")),
  ).length;
  const manual = members.length - automatic;
  useEffect(() => {
    if (!selectedUserId && visibleUsers[0])
      setSelectedUserId(visibleUsers[0].id);
  }, [selectedUserId, visibleUsers]);

  const changeGroup = (nextSegment: Segment) => {
    if (!selectedUser || !onGroupsChange || !canEditRoles) return;
    const base = (selectedUser.groups ?? []).filter(
      (group) => !group.startsWith("segment:"),
    );
    const parent = SEGMENTS.find((item) => item.id === "subscribed")!;
    onGroupsChange(
      selectedUser.id,
      nextSegment.parent === "subscribed"
        ? [...base, parent.value, nextSegment.value]
        : [...base, nextSegment.value],
    );
  };
  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onCreateCustomUser) return;
    const parsed = parseGroupList(groups);
    if (!email.trim() || !uuid.trim() || parsed.length === 0) {
      setCreateError("请填写邮箱、UUID 和至少一个分组");
      return;
    }
    setCreating(true);
    setNotice(undefined);
    setCreateError(undefined);
    try {
      await onCreateCustomUser({
        email: email.trim(),
        uuid: uuid.trim(),
        groups: parsed,
      });
      setNotice("用户创建成功");
      setEmail("");
      setUuid("");
      setGroups("");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const exportMembers = () => {
    const header = ["email", "name", "group", "source", "created_at"];
    const rows = visibleUsers.map((user) => [
      user.email,
      nameOf(user),
      primarySegment(user).label,
      (user.groups ?? []).some((group) => group.startsWith("segment:"))
        ? "manual"
        : "automatic",
      user.created_at ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const downloadUrl = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `${segment.id}-members.csv`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
  };

  const importMembers = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onGroupsChange || !canEditRoles) return;
    const sourceText = await file.text();
    const importedEmails = sourceText
      .split(/\r?\n/)
      .map((line) =>
        line.split(",")[0]?.replace(/^"|"$/g, "").trim().toLowerCase(),
      )
      .filter((value): value is string => Boolean(value) && value !== "email");
    const matchingUsers = data.filter((user) =>
      importedEmails.includes(user.email.toLowerCase()),
    );
    matchingUsers.forEach((user) => {
      const base = (user.groups ?? []).filter(
        (group) => !group.startsWith("segment:"),
      );
      const parent = SEGMENTS.find((item) => item.id === "subscribed")!;
      onGroupsChange(
        user.id,
        segment.parent === "subscribed"
          ? [...base, parent.value, segment.value]
          : [...base, segment.value],
      );
    });
    setNotice(
      matchingUsers.length
        ? `已开始更新 ${matchingUsers.length} 名现有成员`
        : "没有找到可匹配的现有用户",
    );
  };

  return (
    <Card>
      <div className="space-y-5">
        <header className="flex flex-col gap-4 border-b border-[color:var(--color-surface-border)] pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-heading)]">
              用户组标签
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              按用户分组管理订阅权益，并保留自动规则与人工覆盖的来源。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onManageBlacklist}
              className="rounded-md border border-[color:var(--color-surface-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-slate-50"
            >
              管理黑名单
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={importMembers}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-surface-border)] px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-slate-50"
            >
              <FileUp className="h-4 w-4" />
              导入成员
            </button>
            <button
              type="button"
              onClick={exportMembers}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              <Download className="h-4 w-4" />
              导出成员
            </button>
          </div>
        </header>
        <div className="grid min-h-[620px] grid-cols-1 divide-y divide-[color:var(--color-surface-border)] lg:grid-cols-[220px_minmax(0,1fr)_290px] lg:divide-x lg:divide-y-0">
          <aside className="py-3 lg:pr-4">
            <div className="mb-3 flex items-center justify-between px-2">
              <span className="text-sm font-semibold text-[var(--color-heading)]">
                用户分组
              </span>
              <button
                type="button"
                className="text-xs font-medium text-[var(--color-primary)]"
              >
                福利与特权
              </button>
            </div>
            <nav aria-label="用户组标签" className="space-y-1">
              {SEGMENTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSegmentId(item.id)}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${item.parent ? "ml-4 w-[calc(100%-1rem)]" : "w-full"} ${item.id === segmentId ? "bg-[color:color-mix(in_srgb,var(--color-primary)_10%,white)] font-semibold text-[var(--color-primary)]" : "text-[var(--color-text-muted)] hover:bg-slate-50"}`}
                >
                  <span>{item.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    {data.filter((user) => hasSegment(user, item)).length}
                  </span>
                </button>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 py-4 lg:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-heading)]">
                  {segment.label}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {segment.description} · {members.length} 名成员
                </p>
              </div>
              <button
                type="button"
                disabled={!canEditRoles || !selectedUser}
                onClick={() => changeGroup(segment)}
                className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UsersRound className="h-4 w-4" />
                手动调整分组
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <label className="relative block flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索用户（邮箱 / 名称 / UID）"
                  className="w-full rounded-md border border-[color:var(--color-surface-border)] py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--color-primary)]"
                />
              </label>
              <label className="relative">
                <select
                  value={source}
                  onChange={(event) =>
                    setSource(event.target.value as typeof source)
                  }
                  className="appearance-none rounded-md border border-[color:var(--color-surface-border)] bg-white px-3 py-2 pr-8 text-sm text-[var(--color-text-muted)]"
                >
                  <option value="all">全部加入方式</option>
                  <option value="automatic">账单同步</option>
                  <option value="manual">手动覆盖</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
              </label>
            </div>
            <div className="mt-4 overflow-x-auto rounded-md border border-[color:var(--color-surface-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-3 py-3 font-medium">用户</th>
                    <th className="px-3 py-3 font-medium">当前分组</th>
                    <th className="px-3 py-3 font-medium">加入方式</th>
                    <th className="px-3 py-3 font-medium">订阅有效期</th>
                    <th className="px-3 py-3 font-medium">福利与特权</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-surface-border)]">
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td colSpan={5} className="px-3 py-5">
                            <span className="block h-3 rounded bg-slate-100" />
                          </td>
                        </tr>
                      ))
                    : visibleUsers.map((user) => {
                        const isManual = (user.groups ?? []).some((group) =>
                          group.startsWith("segment:"),
                        );
                        return (
                          <tr
                            key={user.id}
                            onClick={() => setSelectedUserId(user.id)}
                            className={`cursor-pointer transition ${selectedUser?.id === user.id ? "bg-[color:color-mix(in_srgb,var(--color-primary)_7%,white)]" : "hover:bg-slate-50"}`}
                          >
                            <td className="px-3 py-3">
                              <p className="font-medium text-[var(--color-heading)]">
                                {nameOf(user)}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                {user.email}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-[var(--color-primary)]">
                              {primarySegment(user).label}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className={`rounded-full px-2 py-1 text-xs ${isManual ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"}`}
                              >
                                {isManual ? "手动覆盖" : "账单同步"}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs text-[var(--color-text-muted)]">
                              {formatDate(user.created_at)} —
                            </td>
                            <td className="px-3 py-3 text-xs text-[var(--color-text-muted)]">
                              {isManual ? "高级版套餐" : "标准版套餐"}
                            </td>
                          </tr>
                        );
                      })}
                </tbody>
              </table>
              {!isLoading && visibleUsers.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">
                  该分组暂无匹配的成员
                </p>
              ) : null}
            </div>
          </main>
          <aside className="py-4 lg:pl-5">
            <h3 className="text-base font-semibold text-[var(--color-heading)]">
              编辑成员
            </h3>
            {selectedUser ? (
              <div className="mt-4 space-y-5">
                <div className="border-b border-[color:var(--color-surface-border)] pb-4">
                  <p className="font-medium text-[var(--color-heading)]">
                    {selectedUser.email}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    UID · {selectedUser.id}
                  </p>
                </div>
                <section>
                  <p className="text-sm font-medium text-[var(--color-heading)]">
                    当前分组
                  </p>
                  <label className="relative mt-2 block">
                    <select
                      value={primarySegment(selectedUser).id}
                      onChange={(event) => {
                        const target = SEGMENTS.find(
                          (item) => item.id === event.target.value,
                        );
                        if (target) changeGroup(target);
                      }}
                      disabled={!canEditRoles || pending.has(selectedUser.id)}
                      className="w-full appearance-none rounded-md border border-[color:var(--color-surface-border)] bg-white px-3 py-2 pr-8 text-sm outline-none disabled:opacity-50"
                    >
                      {SEGMENTS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-slate-400" />
                  </label>
                </section>
                <section className="rounded-md border border-[color:var(--color-surface-border)] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-heading)]">
                        手动覆盖
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
                        手动指定分组与有效期，覆盖自动规则。
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={override}
                      onChange={(event) => setOverride(event.target.checked)}
                      aria-label="启用手动覆盖"
                      className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                    />
                  </div>
                </section>
                <section>
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-[var(--color-primary)]" />
                    <p className="text-sm font-medium text-[var(--color-heading)]">
                      订阅有效期
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-[var(--color-text-muted)]">
                      开始日期
                      <input
                        type="date"
                        value={validFrom}
                        onChange={(event) => setValidFrom(event.target.value)}
                        disabled={!override}
                        className="mt-1 w-full rounded-md border border-[color:var(--color-surface-border)] px-2 py-2 text-sm disabled:bg-slate-50"
                      />
                    </label>
                    <label className="text-xs text-[var(--color-text-muted)]">
                      结束日期
                      <input
                        type="date"
                        value={validUntil}
                        min={validFrom}
                        onChange={(event) => setValidUntil(event.target.value)}
                        disabled={!override}
                        className="mt-1 w-full rounded-md border border-[color:var(--color-surface-border)] px-2 py-2 text-sm disabled:bg-slate-50"
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[var(--color-text-muted)]">
                    有效期字段待计费服务提供读写接口后持久化；当前保存只更新手动分组。
                  </p>
                </section>
                <section>
                  <p className="text-sm font-medium text-[var(--color-heading)]">
                    福利与特权
                  </p>
                  <select
                    value={benefit}
                    onChange={(event) => setBenefit(event.target.value)}
                    className="mt-2 w-full rounded-md border border-[color:var(--color-surface-border)] bg-white px-3 py-2 text-sm"
                  >
                    <option>高级版套餐</option>
                    <option>标准版套餐</option>
                    <option>内部员工套餐</option>
                  </select>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-primary)]"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    查看权益详情
                  </button>
                </section>
                <section className="border-t border-[color:var(--color-surface-border)] pt-4">
                  <p className="text-sm font-medium text-[var(--color-heading)]">
                    成员来源
                  </p>
                  <div className="mt-3">
                    <Donut automatic={automatic} manual={manual} />
                  </div>
                </section>
              </div>
            ) : (
              <p className="mt-6 text-sm text-[var(--color-text-muted)]">
                从成员列表选择一项以查看详情。
              </p>
            )}
          </aside>
        </div>
        {canCreateCustomUser ? (
          <details className="rounded-md border border-[color:var(--color-surface-border)] p-4">
            <summary className="cursor-pointer text-sm font-medium text-[var(--color-heading)]">
              Root 管理员：创建自定义 UUID 用户
            </summary>
            <form
              onSubmit={createUser}
              className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"
            >
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="邮箱"
                className="rounded-md border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
              />
              <input
                value={uuid}
                onChange={(event) => setUuid(event.target.value)}
                placeholder="自定义 UUID"
                className="rounded-md border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
              />
              <input
                value={groups}
                onChange={(event) => setGroups(event.target.value)}
                placeholder="分组，用逗号分隔"
                className="rounded-md border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={creating}
                className="w-fit rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {creating ? "创建中…" : "创建用户"}
              </button>
              {notice ? (
                <p className="text-sm text-emerald-700">{notice}</p>
              ) : null}
              {createError ? (
                <p className="text-sm text-red-600">{createError}</p>
              ) : null}
            </form>
          </details>
        ) : null}
      </div>
    </Card>
  );
}
export default UserGroupManagement;
