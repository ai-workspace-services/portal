"use client";

import { type FormEvent, useMemo, useState } from "react";
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

type UserGroupManagementProps = {
  users?: ManagedUser[];
  isLoading?: boolean;
  pendingUserIds?: Set<string>;
  canEditRoles: boolean;
  canCreateCustomUser?: boolean;
  onRoleChange?: (userId: string, role: string) => void;
  onInvite?: () => void;
  onImport?: () => void;
  onPauseUser?: (userId: string) => void;
  onResumeUser?: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onRenewUuid?: (userId: string) => void;
  onManageBlacklist?: () => void;
  onCreateCustomUser?: (input: CreateManagedUserInput) => Promise<void> | void;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "管理员" },
  { value: "operator", label: "运营者" },
  { value: "user", label: "用户" },
];

function parseGroupList(input: string): string[] {
  const values = input
    .split(/[\n,，]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return Array.from(new Set(values));
}

function getUserDisplayName(user: ManagedUser): string {
  const username = user.username?.trim();
  if (username) {
    return username;
  }

  const name = user.name?.trim();
  if (name) {
    return name;
  }

  const email = user.email?.trim();
  if (email) {
    return email;
  }

  return "—";
}

export function UserGroupManagement({
  users,
  isLoading = false,
  pendingUserIds,
  canEditRoles,
  canCreateCustomUser = false,
  onRoleChange,
  onInvite,
  onImport,
  onPauseUser,
  onResumeUser,
  onDeleteUser,
  onRenewUuid,
  onManageBlacklist,
  onCreateCustomUser,
}: UserGroupManagementProps) {
  const data = useMemo(() => users ?? [], [users]);
  const pendingSet = pendingUserIds ?? new Set<string>();

  const [customEmail, setCustomEmail] = useState("");
  const [customUuid, setCustomUuid] = useState("");
  const [customGroups, setCustomGroups] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | undefined>();
  const [createError, setCreateError] = useState<string | undefined>();

  const parsedCustomGroups = useMemo(
    () => parseGroupList(customGroups),
    [customGroups],
  );

  const handleCreateCustomUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onCreateCustomUser) {
      return;
    }

    const email = customEmail.trim();
    const uuid = customUuid.trim();
    if (!email || !uuid) {
      setCreateError("请填写邮箱与 UUID");
      return;
    }

    const groups = parsedCustomGroups;
    if (groups.length === 0) {
      setCreateError("请至少填写一个用户组");
      return;
    }

    setIsCreating(true);
    setCreateError(undefined);
    setCreateMessage(undefined);

    try {
      await onCreateCustomUser({ email, uuid, groups });
      setCreateMessage("用户创建成功");
      setCustomEmail("");
      setCustomUuid("");
      setCustomGroups("");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "创建失败");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">用户组</h2>
            <p className="text-sm text-gray-500">
              查看当前成员并调整角色或发起邀请
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onManageBlacklist}
              className="inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
            >
              管理黑名单
            </button>
            <button
              type="button"
              onClick={onInvite}
              className="inline-flex items-center rounded-full border border-purple-200 px-4 py-2 text-sm font-medium text-purple-600 transition hover:border-purple-300 hover:bg-purple-50"
            >
              批量邀请
            </button>
            <button
              type="button"
              onClick={onImport}
              className="inline-flex items-center rounded-full border border-purple-200 px-4 py-2 text-sm font-medium text-purple-600 transition hover:border-purple-300 hover:bg-purple-50"
            >
              批量导入
            </button>
          </div>
        </header>

        {canCreateCustomUser ? (
          <form
            onSubmit={handleCreateCustomUser}
            className="rounded-xl border border-purple-100 bg-purple-50/60 p-4"
          >
            <h3 className="text-sm font-semibold text-purple-800">
              Root 管理员专用：创建自定义 UUID 用户
            </h3>
            <p className="mt-1 text-xs text-purple-700">
              支持一次配置多个分组（逗号或换行分隔）。
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                邮箱
                <input
                  type="email"
                  value={customEmail}
                  onChange={(event) => setCustomEmail(event.target.value)}
                  placeholder="user@example.com"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600">
                自定义 UUID
                <input
                  type="text"
                  value={customUuid}
                  onChange={(event) => setCustomUuid(event.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-gray-600 md:col-span-2">
                分组列表
                <textarea
                  value={customGroups}
                  onChange={(event) => setCustomGroups(event.target.value)}
                  placeholder="group-a,group-b"
                  rows={3}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isCreating}
                className="inline-flex items-center rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating ? "创建中…" : "创建用户"}
              </button>
              {createMessage ? (
                <span className="text-xs text-green-700">{createMessage}</span>
              ) : null}
              {createError ? (
                <span className="text-xs text-red-600">{createError}</span>
              ) : null}
            </div>
          </form>
        ) : null}

        <div
          className="overflow-x-auto"
          aria-busy={isLoading}
          aria-live="polite"
        >
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50/80 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">邮箱</th>
                <th className="px-4 py-2 font-medium">用户名</th>
                <th className="px-4 py-2 font-medium">角色</th>
                <th className="px-4 py-2 font-medium">用户组</th>
                <th className="px-4 py-2 font-medium">状态</th>
                <th className="px-4 py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white/80">
              {isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td className="px-4 py-3">
                        <span className="inline-block h-4 w-48 rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block h-4 w-28 rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block h-4 w-24 rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block h-4 w-32 rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block h-4 w-16 rounded bg-gray-200" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block h-4 w-24 rounded bg-gray-200" />
                      </td>
                    </tr>
                  ))
                : data.map((user) => {
                    const role = user.role ?? "user";
                    const isPending = pendingSet.has(user.id);
                    const isActive = user.active !== false;
                    return (
                      <tr
                        key={user.id}
                        className="transition hover:bg-purple-50/50"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {getUserDisplayName(user)}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="w-40 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                            value={role}
                            disabled={!canEditRoles || isPending}
                            onChange={(event) =>
                              onRoleChange?.(user.id, event.target.value)
                            }
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {isPending ? (
                            <p className="mt-1 text-xs text-purple-500">
                              更新中…
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {user.groups?.join("、") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                          >
                            {isActive ? "活跃" : "已暂停"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {isActive ? (
                              <button
                                onClick={() => onPauseUser?.(user.id)}
                                className="text-xs text-orange-600 hover:text-orange-700"
                              >
                                暂停
                              </button>
                            ) : (
                              <button
                                onClick={() => onResumeUser?.(user.id)}
                                className="text-xs text-green-600 hover:text-green-700"
                              >
                                恢复
                              </button>
                            )}
                            <button
                              onClick={() => onRenewUuid?.(user.id)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              重置 UUID
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  confirm("确定要删除该用户吗？此操作不可逆。")
                                ) {
                                  onDeleteUser?.(user.id);
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {!isLoading && data.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-500">
              暂无用户数据
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
export default UserGroupManagement;
