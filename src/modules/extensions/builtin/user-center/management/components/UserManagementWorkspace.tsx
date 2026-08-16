"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Copy,
  Download,
  Eye,
  KeyRound,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  UserMinus,
  Users,
} from "lucide-react";

import type { ManagedUser } from "./UserGroupManagement";

type UserManagementWorkspaceProps = {
  users?: ManagedUser[];
  isLoading?: boolean;
  canEditRoles: boolean;
  pendingUserIds?: Set<string>;
  onRoleChange?: (userId: string, role: string) => void;
  onPauseUser?: (userId: string) => void;
  onResumeUser?: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onRenewUuid?: (userId: string) => void;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  operator: "运营者",
  user: "用户",
};

function displayName(user: ManagedUser): string {
  return user.username?.trim() || user.name?.trim() || user.email;
}

function initials(user: ManagedUser): string {
  const value = displayName(user).trim();
  return value ? value.slice(0, 1).toUpperCase() : "U";
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(date);
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
        active
          ? "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]"
          : "bg-[var(--color-danger-muted)] text-[var(--color-danger-foreground)]"
      }`}
    >
      {active ? "活跃" : "停用"}
    </span>
  );
}

export default function UserManagementWorkspace({
  users,
  isLoading = false,
  canEditRoles,
  pendingUserIds,
  onRoleChange,
  onPauseUser,
  onResumeUser,
  onDeleteUser,
  onRenewUuid,
}: UserManagementWorkspaceProps) {
  const data = useMemo(() => users ?? [], [users]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(
    data[0]?.id,
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [selectedTab, setSelectedTab] = useState("概览");

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return data.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        displayName(user).toLowerCase().includes(normalizedQuery) ||
        user.id.toLowerCase().includes(normalizedQuery);
      const role = user.role ?? "user";
      const matchesRole = roleFilter === "all" || role === roleFilter;
      const active = user.active !== false;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && active) ||
        (statusFilter === "inactive" && !active);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [data, query, roleFilter, statusFilter]);

  const selectedUser = isInspectorOpen
    ? (data.find((user) => user.id === selectedUserId) ?? visibleUsers[0])
    : undefined;
  const selectedActive = selectedUser?.active !== false;
  const pending = selectedUser ? pendingUserIds?.has(selectedUser.id) : false;

  const selectUser = (user: ManagedUser) => {
    setSelectedUserId(user.id);
    setIsInspectorOpen(true);
    setSelectedTab("概览");
  };

  const copyUuid = async () => {
    if (!selectedUser || typeof navigator === "undefined") return;
    await navigator.clipboard?.writeText(selectedUser.id);
  };

  return (
    <div className="grid min-h-[640px] grid-cols-1 border-t border-[color:var(--color-surface-border)] xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="min-w-0 p-3 sm:p-4">
        <div className="flex flex-col gap-3 border-b border-[color:var(--color-surface-border)] pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[220px] flex-1 sm:max-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-subtle)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索用户（邮箱 / 用户名 / UID）"
                className="h-9 w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-muted)]"
              />
            </label>
            <label className="relative">
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="h-9 appearance-none rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 pr-8 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="all">所有角色</option>
                <option value="admin">管理员</option>
                <option value="operator">运营者</option>
                <option value="user">用户</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-[var(--color-text-subtle)]" />
            </label>
            <label className="relative">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-9 appearance-none rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 pr-8 text-sm outline-none focus:border-[var(--color-primary)]"
              >
                <option value="all">所有状态</option>
                <option value="active">活跃</option>
                <option value="inactive">停用</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-4 w-4 text-[var(--color-text-subtle)]" />
            </label>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
              className="ml-auto inline-flex h-9 items-center gap-2 rounded-md border border-[color:var(--color-surface-border)] px-3 text-sm text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)]"
            >
              <RefreshCw className="h-4 w-4" />
              重置
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span>{selectedUser ? "已选择 1 项" : "未选择用户"}</span>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[color:var(--color-surface-border)] px-2.5 hover:bg-[var(--color-surface-hover)]"
            >
              批量操作 <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="inline-flex h-8 items-center gap-1 rounded-md border border-[color:var(--color-surface-border)] px-2.5 hover:bg-[var(--color-surface-hover)]"
            >
              <Download className="h-3.5 w-3.5" /> 导出
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto" aria-busy={isLoading}>
          <table className="min-w-[780px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead className="bg-[var(--color-surface-muted)] text-xs font-medium text-[var(--color-text-muted)]">
              <tr>
                <th className="w-10 rounded-l-md px-3 py-2.5">
                  <input aria-label="选择所有用户" type="checkbox" />
                </th>
                <th className="px-3 py-2.5 font-medium">用户信息</th>
                <th className="px-3 py-2.5 font-medium">角色</th>
                <th className="px-3 py-2.5 font-medium">用户组</th>
                <th className="px-3 py-2.5 font-medium">状态</th>
                <th className="px-3 py-2.5 font-medium">注册时间</th>
                <th className="rounded-r-md px-3 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, index) => (
                    <tr
                      key={index}
                      className="animate-pulse border-b border-[color:var(--color-surface-border)]"
                    >
                      <td colSpan={7} className="py-5">
                        <span className="block h-4 rounded bg-[var(--color-surface-muted)]" />
                      </td>
                    </tr>
                  ))
                : visibleUsers.map((user) => {
                    const active = user.active !== false;
                    const isSelected = selectedUser?.id === user.id;
                    const role = user.role ?? "user";
                    return (
                      <tr
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className={`cursor-pointer border-b border-[color:var(--color-surface-border)] transition ${
                          isSelected
                            ? "bg-[var(--color-primary-muted)]/70 outline outline-1 -outline-offset-1 outline-[var(--color-primary)]"
                            : "hover:bg-[var(--color-surface-hover)]"
                        }`}
                      >
                        <td
                          className="px-3 py-2.5"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            aria-label={`选择 ${user.email}`}
                            checked={isSelected}
                            onChange={() => selectUser(user)}
                            type="checkbox"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
                              {initials(user)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-[var(--color-heading)]">
                                {user.email}
                              </span>
                              <span className="block truncate text-xs text-[var(--color-text-subtle)]">
                                {displayName(user)}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-md border border-[var(--color-primary-border)] bg-white/70 px-2 py-1 text-xs font-medium text-[var(--color-primary)]">
                            {ROLE_LABELS[role] ?? role}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex max-w-[180px] flex-wrap gap-1">
                            {(user.groups ?? []).slice(0, 2).map((group) => (
                              <span
                                key={group}
                                className="rounded-md border border-[color:var(--color-surface-border)] bg-white/70 px-1.5 py-0.5 text-xs text-[var(--color-text-muted)]"
                              >
                                {group.replace("segment:", "")}
                              </span>
                            ))}
                            {!(user.groups ?? []).length ? (
                              <span className="text-[var(--color-text-subtle)]">
                                —
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusPill active={active} />
                        </td>
                        <td className="px-3 py-2.5 text-[var(--color-text-muted)]">
                          {user.created_at ? formatDate(user.created_at) : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div
                            className="flex items-center gap-1"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => selectUser(user)}
                              aria-label={`查看 ${user.email}`}
                              className="rounded-md border border-[color:var(--color-surface-border)] p-1.5 hover:bg-white"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onRenewUuid?.(user.id)}
                              aria-label={`重置 ${user.email} UUID`}
                              className="rounded-md border border-[color:var(--color-surface-border)] p-1.5 hover:bg-white"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`更多 ${user.email} 操作`}
                              className="rounded-md border border-[color:var(--color-surface-border)] p-1.5 hover:bg-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!isLoading && visibleUsers.length === 0 ? (
            <p className="py-12 text-center text-sm text-[var(--color-text-subtle)]">
              没有找到匹配的用户
            </p>
          ) : null}
        </div>
        <footer className="flex items-center justify-between border-t border-[color:var(--color-surface-border)] pt-3 text-sm text-[var(--color-text-muted)]">
          <span>共 {visibleUsers.length} 条</span>
          <div className="flex items-center gap-3">
            <button type="button" className="text-[var(--color-text-subtle)]">
              ‹
            </button>
            <span className="rounded-md bg-[var(--color-primary)] px-2.5 py-1 text-white">
              1
            </span>
            <span>2</span>
            <button type="button" className="text-[var(--color-text-subtle)]">
              ›
            </button>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-[color:var(--color-surface-border)] px-2.5 py-1.5"
          >
            10 条/页 <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </footer>
      </section>

      <aside className="border-t border-[color:var(--color-surface-border)] bg-white xl:border-l xl:border-t-0">
        {selectedUser ? (
          <div className="sticky top-0">
            <header className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] px-5 py-4">
              <h2 className="font-semibold text-[var(--color-heading)]">
                用户详情
              </h2>
              <button
                type="button"
                onClick={() => setIsInspectorOpen(false)}
                aria-label="关闭用户详情"
                className="text-lg text-[var(--color-text-subtle)]"
              >
                ×
              </button>
            </header>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-primary)] text-lg font-semibold text-white">
                  {initials(selectedUser)}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--color-heading)]">
                      {selectedUser.email}
                    </p>
                    <StatusPill active={selectedActive} />
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--color-text-muted)]">
                    {displayName(selectedUser)}
                  </p>
                </div>
              </div>
              <button
                onClick={copyUuid}
                type="button"
                className="mt-3 inline-flex max-w-full items-center gap-1 text-xs text-[var(--color-text-subtle)] hover:text-[var(--color-primary)]"
              >
                <span className="truncate">UID: {selectedUser.id}</span>
                <Copy className="h-3.5 w-3.5 shrink-0" />
              </button>
            </div>
            <div className="flex border-b border-[color:var(--color-surface-border)] px-3">
              {["概览", "成员关系", "登录记录", "操作记录"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={`border-b-2 px-3 py-3 text-xs font-medium ${selectedTab === tab ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-transparent text-[var(--color-text-muted)]"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="space-y-3 p-4">
              {selectedTab === "概览" ? (
                <>
                  <section className="rounded-md border border-[color:var(--color-surface-border)] p-3.5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-[var(--color-heading)]">
                        基本信息
                      </h3>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-[color:var(--color-surface-border)] px-2 py-1 text-xs hover:bg-[var(--color-surface-hover)]"
                      >
                        <Pencil className="h-3 w-3" />
                        编辑
                      </button>
                    </div>
                    <dl className="grid grid-cols-[86px_1fr] gap-x-3 gap-y-3 text-sm">
                      <dt className="text-[var(--color-text-subtle)]">邮箱</dt>
                      <dd className="break-all text-[var(--color-text-muted)]">
                        {selectedUser.email}
                      </dd>
                      <dt className="text-[var(--color-text-subtle)]">
                        用户名
                      </dt>
                      <dd>{displayName(selectedUser)}</dd>
                      <dt className="text-[var(--color-text-subtle)]">角色</dt>
                      <dd>
                        <select
                          aria-label="用户角色"
                          value={selectedUser.role ?? "user"}
                          disabled={!canEditRoles || pending}
                          onChange={(event) =>
                            onRoleChange?.(selectedUser.id, event.target.value)
                          }
                          className="rounded-md border border-[var(--color-primary-border)] bg-white px-2 py-1 text-xs text-[var(--color-primary)]"
                        >
                          <option value="admin">管理员</option>
                          <option value="operator">运营者</option>
                          <option value="user">用户</option>
                        </select>
                      </dd>
                      <dt className="text-[var(--color-text-subtle)]">
                        用户组
                      </dt>
                      <dd className="flex flex-wrap gap-1">
                        {(selectedUser.groups ?? []).map((group) => (
                          <span
                            key={group}
                            className="rounded-md border border-[color:var(--color-surface-border)] px-1.5 py-0.5 text-xs"
                          >
                            {group.replace("segment:", "")}
                          </span>
                        )) || "—"}
                      </dd>
                      <dt className="text-[var(--color-text-subtle)]">状态</dt>
                      <dd>
                        <StatusPill active={selectedActive} />
                      </dd>
                      <dt className="text-[var(--color-text-subtle)]">
                        注册时间
                      </dt>
                      <dd>{formatDate(selectedUser.created_at)}</dd>
                      <dt className="text-[var(--color-text-subtle)]">备注</dt>
                      <dd>—</dd>
                    </dl>
                  </section>
                  <section className="rounded-md border border-[color:var(--color-surface-border)] p-3.5">
                    <h3 className="mb-3 font-semibold text-[var(--color-heading)]">
                      快捷操作
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          selectedActive
                            ? onPauseUser?.(selectedUser.id)
                            : onResumeUser?.(selectedUser.id)
                        }
                        className="inline-flex items-center gap-2 rounded-md border border-[color:var(--color-surface-border)] p-2.5 text-left text-sm hover:bg-[var(--color-surface-hover)]"
                      >
                        <UserMinus className="h-4 w-4 text-red-500" />
                        {selectedActive ? "禁用用户" : "恢复用户"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRenewUuid?.(selectedUser.id)}
                        className="inline-flex items-center gap-2 rounded-md border border-[color:var(--color-surface-border)] p-2.5 text-left text-sm hover:bg-[var(--color-surface-hover)]"
                      >
                        <KeyRound className="h-4 w-4 text-[var(--color-primary)]" />
                        重置 UUID
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md border border-[color:var(--color-surface-border)] p-2.5 text-left text-sm hover:bg-[var(--color-surface-hover)]"
                      >
                        <Users className="h-4 w-4 text-[var(--color-primary)]" />
                        管理用户组
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteUser?.(selectedUser.id)}
                        className="inline-flex items-center gap-2 rounded-md border border-[color:var(--color-surface-border)] p-2.5 text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-muted)]"
                      >
                        <Trash2 className="h-4 w-4" />
                        删除用户
                      </button>
                    </div>
                  </section>
                  <section className="rounded-md border border-[color:var(--color-surface-border)] p-3.5">
                    <h3 className="mb-3 font-semibold text-[var(--color-heading)]">
                      更多信息
                    </h3>
                    <dl className="grid grid-cols-[86px_1fr] gap-x-3 gap-y-3 text-sm">
                      <dt className="text-[var(--color-text-subtle)]">
                        权限范围
                      </dt>
                      <dd>所有站点</dd>
                      <dt className="text-[var(--color-text-subtle)]">
                        MFA（多因素认证）
                      </dt>
                      <dd>未启用</dd>
                      <dt className="text-[var(--color-text-subtle)]">
                        邮箱验证
                      </dt>
                      <dd>已验证</dd>
                    </dl>
                  </section>
                </>
              ) : (
                <section className="rounded-md border border-dashed border-[color:var(--color-surface-border)] px-4 py-10 text-center text-sm text-[var(--color-text-subtle)]">
                  <UserCog className="mx-auto mb-3 h-5 w-5" />
                  {selectedTab}将在接入审计 API 后显示。
                </section>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[420px] flex-col items-center justify-center px-6 text-center text-[var(--color-text-subtle)]">
            <ShieldCheck className="mb-3 h-6 w-6" />
            <p className="text-sm">从用户列表选择一项以查看详情</p>
          </div>
        )}
      </aside>
    </div>
  );
}
