"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  BarChart3,
  Mail,
  Server,
  ShieldCheck,
  UsersRound,
  Video,
} from "lucide-react";

import Card from "../components/Card";
import EmailManagementPanel from "../management/components/EmailManagementPanel";
import { emailCopy } from "@/lib/email-preferences";
import TrendChart, {
  type MetricsSeries,
} from "../management/components/TrendChart";
import OverviewCards, {
  type MetricsOverview,
} from "../management/components/OverviewCards";
import PermissionMatrixEditor, {
  type PermissionMatrix,
} from "../management/components/PermissionMatrixEditor";
import NetworkTeamsPanel from "../components/NetworkTeamsPanel";
import UserGroupManagement, {
  type AdminPlanGroupPreview,
  type AdminPlanGroupUpdate,
  type ManagedUser,
  type CreateManagedUserInput,
} from "../management/components/UserGroupManagement";
import HomepageVideoSettingsPanel from "../management/components/HomepageVideoSettingsPanel";
import { EmailBlacklist } from "../management/components/EmailBlacklist";
import DeleteUserDialog, {
  type DeleteUserTarget,
} from "../management/components/DeleteUserDialog";
import UserManagementWorkspace from "../management/components/UserManagementWorkspace";
import MfaRecoveryReviews from "@/components/auth/MfaRecoveryReviews";
import { resolveAccess } from "@lib/accessControl";
import type { HomepageVideoSettingsResponse } from "@/lib/home/homepageVideo";
import { useUserStore } from "@lib/userStore";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";
import { ADMIN_API_BASE } from "../lib/adminApi";

type UserMetricsResponse = {
  overview: MetricsOverview;
  series: MetricsSeries;
};

type AdminSettingsResponse = {
  version: number;
  matrix: PermissionMatrix;
};

type ApiError = {
  error?: string;
  message?: string;
  matrix?: PermissionMatrix;
  version?: number;
};

async function jsonFetcher<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : init?.headers),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let payload: ApiError | undefined;
    try {
      payload = (await response.json()) as ApiError;
    } catch (error) {
      // Ignore JSON parse errors; fall back to status text below.
    }
    const message = payload?.message ?? payload?.error ?? response.statusText;
    throw new Error(message || "请求失败");
  }

  return (await response.json()) as T;
}

type ManagementTab = "users" | "permissions" | "groups" | "homepage" | "email";

function createDeleteRequestId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `delete-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDeleteUserError(error: unknown): string {
  const raw = error instanceof Error ? error.message.trim() : "";
  switch (raw) {
    case "a reason is required for this change and is recorded in the audit log":
      return "请填写删除原因，变更会写入审计日志。";
    case "reason must be at most 500 characters":
      return "删除原因最多 500 个字符。";
    case "administrator or paid accounts are protected from archive":
      return "管理员账号或付费/有效订阅账号受保护，无法删除归档。";
    case "user is already archived":
      return "该用户已归档，无需重复删除。";
    case "atomic archive requires the account lifecycle migration":
      return "后端账号生命周期表结构尚未完成迁移，暂无法执行归档删除。";
    case "user not found":
      return "目标用户不存在或已被移除。";
    default:
      return raw || "删除用户失败";
  }
}

export default function UserCenterManagementRoute({
  showAgents = false,
}: {
  showAgents?: boolean;
} = {}) {
  const router = useRouter();
  const { language } = useLanguage();
  const t = translations[language].userCenter;
  const user = useUserStore((state) => state.user);
  const isUserLoading = useUserStore((state) => state.isLoading);
  const accessDecision = useMemo(
    () =>
      resolveAccess(user, {
        requireLogin: true,
        roles: ["admin", "operator"],
        permissions: [
          "admin.settings.read",
          "admin.users.metrics.read",
          "admin.users.list.read",
          "admin.agents.status.read",
          "admin.blacklist.read",
        ],
      }),
    [user],
  );
  const canAccess = accessDecision.allowed;
  const canViewAgents =
    accessDecision.userRole === "admin" || accessDecision.userRole === "operator";
  const canEditPermissions = Boolean(user?.isAdmin);
  const canEditRoles = Boolean(user?.isAdmin);
  const canDeleteUsers = Boolean(
    accessDecision.userRole === "admin" ||
      user?.isAdmin ||
      user?.isRoot ||
      user?.permissions?.includes("admin.users.delete.write"),
  );
  const canCreateCustomUser = Boolean(user?.isRoot);
  const canManageSubscriptions = Boolean(
    user?.isRoot || user?.isAdmin || user?.role === "operator",
  );

  const [matrixDraft, setMatrixDraft] = useState<PermissionMatrix>({});
  const [matrixVersion, setMatrixVersion] = useState<number>(0);
  const [matrixDirty, setMatrixDirty] = useState(false);
  const [matrixSaving, setMatrixSaving] = useState(false);
  const [matrixStatus, setMatrixStatus] = useState<string | undefined>();
  const [matrixError, setMatrixError] = useState<string | undefined>();
  const [roleUpdateMessage, setRoleUpdateMessage] = useState<
    string | undefined
  >();
  const [pendingRoleUpdates, setPendingRoleUpdates] = useState<Set<string>>(
    new Set(),
  );
  const [pendingGroupUpdates, setPendingGroupUpdates] = useState<Set<string>>(
    new Set(),
  );
  const [groupsUpdateMessage, setGroupsUpdateMessage] = useState<
    string | undefined
  >();
  const [pendingAccessIds, setPendingAccessIds] = useState<Set<string>>(
    new Set(),
  );
  const [deleteDialog, setDeleteDialog] = useState<DeleteUserTarget>();
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const [homepageVideoSaving, setHomepageVideoSaving] = useState(false);
  const [homepageVideoStatus, setHomepageVideoStatus] = useState<
    string | undefined
  >();
  const [homepageVideoError, setHomepageVideoError] = useState<
    string | undefined
  >();
  const [managementTab, setManagementTab] = useState<ManagementTab>("users");
  const activeTab = managementTab;

  useEffect(() => {
    if (showAgents) {
      router.replace("/panel/agent", { scroll: false });
    }
  }, [router, showAgents]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (
      params.get("connected") === "google-drive" ||
      params.get("tab") === "groups"
    ) {
      setManagementTab("groups");
    }
  }, []);

  function setActiveTab(tab: ManagementTab) {
    setManagementTab(tab);
  }

  const loadUsers = canAccess && !showAgents;
  const metricsSWR = useSWR<UserMetricsResponse>(
    loadUsers ? `${ADMIN_API_BASE}/users/metrics` : null,
    jsonFetcher,
    {
      revalidateOnFocus: false,
    },
  );
  const settingsSWR = useSWR<AdminSettingsResponse>(
    loadUsers ? `${ADMIN_API_BASE}/settings` : null,
    jsonFetcher,
    {
      revalidateOnFocus: false,
    },
  );
  const usersSWR = useSWR<ManagedUser[]>(
    loadUsers ? "/api/users" : null,
    jsonFetcher,
    {
      revalidateOnFocus: false,
    },
  );
  const homepageVideoSWR = useSWR<HomepageVideoSettingsResponse>(
    loadUsers ? `${ADMIN_API_BASE}/homepage-video` : null,
    jsonFetcher,
    {
      revalidateOnFocus: false,
    },
  );

  useEffect(() => {
    if (settingsSWR.data?.matrix) {
      setMatrixDraft(settingsSWR.data.matrix);
      setMatrixVersion(settingsSWR.data.version);
      setMatrixDirty(false);
      setMatrixError(undefined);
    }
  }, [settingsSWR.data]);

  const lastUpdatedLabel = useMemo(() => {
    if (!metricsSWR.data) {
      return undefined;
    }
    const now = new Date();
    return `更新于 ${now.toLocaleString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }, [metricsSWR.data]);

  const handleTogglePermission = useCallback(
    (moduleKey: string, role: string, nextValue: boolean) => {
      setMatrixDraft((prev) => {
        const next: PermissionMatrix = { ...prev };
        const normalizedModuleKey = moduleKey.trim();
        const normalizedRole = role.trim();
        const currentRoleMap = next[normalizedModuleKey] ?? {};
        next[normalizedModuleKey] = {
          ...currentRoleMap,
          [normalizedRole]: nextValue,
        };
        return next;
      });
      setMatrixDirty(true);
      setMatrixStatus(undefined);
      setMatrixError(undefined);
    },
    [],
  );

  const handleSaveMatrix = useCallback(async () => {
    if (!canEditPermissions || !matrixDirty) {
      return;
    }
    setMatrixSaving(true);
    setMatrixStatus(undefined);
    setMatrixError(undefined);
    try {
      const response = await fetch(`${ADMIN_API_BASE}/settings`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: matrixVersion,
          matrix: matrixDraft,
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as AdminSettingsResponse;
        setMatrixDraft(payload.matrix);
        setMatrixVersion(payload.version);
        setMatrixDirty(false);
        setMatrixStatus("已保存");
        settingsSWR.mutate(payload, { revalidate: false });
        return;
      }

      let payload: ApiError | undefined;
      try {
        payload = (await response.json()) as ApiError;
      } catch (error) {
        // ignore parsing error
      }

      if (response.status === 409 && payload?.matrix) {
        setMatrixDraft(payload.matrix);
        if (typeof payload.version === "number") {
          setMatrixVersion(payload.version);
        }
        setMatrixDirty(false);
        setMatrixError(payload.message ?? "配置已被其他人更新，已同步最新版本");
        return;
      }

      const message = payload?.error ?? payload?.message ?? "保存失败";
      throw new Error(message);
    } catch (error) {
      setMatrixError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setMatrixSaving(false);
    }
  }, [
    canEditPermissions,
    matrixDirty,
    matrixDraft,
    matrixVersion,
    settingsSWR,
  ]);

  const markRolePending = useCallback((userId: string, pending: boolean) => {
    setPendingRoleUpdates((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }, []);

  const markGroupsPending = useCallback((userId: string, pending: boolean) => {
    setPendingGroupUpdates((prev) => {
      const next = new Set(prev);
      if (pending) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }, []);

  const handleGroupsChange = useCallback(
    async (userId: string, groups: string[]) => {
      if (!canEditRoles) {
        return;
      }
      setGroupsUpdateMessage(undefined);
      markGroupsPending(userId, true);
      try {
        await jsonFetcher(`${ADMIN_API_BASE}/users/${userId}/groups`, {
          method: "PUT",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ groups }),
        });
        usersSWR.mutate();
      } catch (error) {
        setGroupsUpdateMessage(
          error instanceof Error ? error.message : "更新失败",
        );
      } finally {
        markGroupsPending(userId, false);
      }
    },
    [canEditRoles, markGroupsPending, usersSWR],
  );

  const handlePlanGroupPreview = useCallback(
    async (
      scope: "single" | "batch",
      updates: AdminPlanGroupUpdate[],
      reason: string,
    ): Promise<AdminPlanGroupPreview> => {
      if (!canEditRoles || updates.length === 0) {
        throw new Error("没有可修改的用户");
      }
      setGroupsUpdateMessage(undefined);
      const endpoint =
        scope === "single"
          ? `${ADMIN_API_BASE}/users/${encodeURIComponent(updates[0].userId)}/plan-group`
          : `${ADMIN_API_BASE}/users/plan-groups/batch`;
      return jsonFetcher<AdminPlanGroupPreview>(endpoint, {
        method: "PUT",
        body: JSON.stringify({
          mode: "preview",
          requestId: crypto.randomUUID(),
          reason,
          updates,
        }),
      });
    },
    [canEditRoles],
  );

  const handlePlanGroupApply = useCallback(
    async (
      scope: "single" | "batch",
      updates: AdminPlanGroupUpdate[],
      requestId: string,
      previewToken: string,
      reason: string,
    ) => {
      if (!canManageSubscriptions || updates.length === 0) return;
      setGroupsUpdateMessage(undefined);
      updates.forEach(({ userId }) => markGroupsPending(userId, true));
      const endpoint =
        scope === "single"
          ? `${ADMIN_API_BASE}/users/${encodeURIComponent(updates[0].userId)}/plan-group`
          : `${ADMIN_API_BASE}/users/plan-groups/batch`;
      try {
        await jsonFetcher(endpoint, {
          method: "PUT",
          body: JSON.stringify({
            mode: "apply",
            requestId,
            previewToken,
            reason,
            updates,
          }),
        });
        await usersSWR.mutate();
      } catch (error) {
        setGroupsUpdateMessage(
          error instanceof Error ? error.message : "套餐变更失败",
        );
        throw error;
      } finally {
        updates.forEach(({ userId }) => markGroupsPending(userId, false));
      }
    },
    [canManageSubscriptions, markGroupsPending, usersSWR],
  );

  const handleSubscriptionRecordsImport = useCallback(
    async (csv: string, reason: string): Promise<AdminPlanGroupPreview> => {
      if (!canManageSubscriptions) throw new Error("没有导入权限");
      return jsonFetcher<AdminPlanGroupPreview>(
        `${ADMIN_API_BASE}/users/plan-groups/batch`,
        {
          method: "PUT",
          body: JSON.stringify({
            mode: "preview",
            requestId: crypto.randomUUID(),
            reason,
            csv,
            reconcile: false,
          }),
        },
      );
    },
    [canManageSubscriptions],
  );

  const handleSubscriptionRecordsExport =
    useCallback(async (): Promise<string> => {
      const response = await fetch(
        `${ADMIN_API_BASE}/users/subscription-records?format=csv&includeHistory=true`,
        { credentials: "include", cache: "no-store" },
      );
      if (!response.ok) throw new Error(`导出失败（HTTP ${response.status}）`);
      return response.text();
    }, []);

  const handleRoleChange = useCallback(
    async (userId: string, role: string) => {
      if (!canEditRoles) {
        return;
      }
      setRoleUpdateMessage(undefined);
      markRolePending(userId, true);
      try {
        await jsonFetcher(`${ADMIN_API_BASE}/users/${userId}/role`, {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        });
        setRoleUpdateMessage("角色已更新");
        usersSWR.mutate();
      } catch (error) {
        setRoleUpdateMessage(
          error instanceof Error ? error.message : "更新失败",
        );
      } finally {
        markRolePending(userId, false);
      }
    },
    [canEditRoles, markRolePending, usersSWR],
  );

  const handleRoleReset = useCallback(
    async (userId: string) => {
      if (!canEditRoles) {
        return;
      }
      setRoleUpdateMessage(undefined);
      markRolePending(userId, true);
      try {
        await jsonFetcher(`${ADMIN_API_BASE}/users/${userId}/role`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
        setRoleUpdateMessage("角色已重置");
        usersSWR.mutate();
      } catch (error) {
        setRoleUpdateMessage(
          error instanceof Error ? error.message : "更新失败",
        );
      } finally {
        markRolePending(userId, false);
      }
    },
    [canEditRoles, markRolePending, usersSWR],
  );

  const handleAccessChange = useCallback(
    async (
      userId: string,
      action: "activate" | "deactivate" | "pause" | "resume",
    ) => {
      if (!canEditRoles) return;
      setPendingAccessIds((previous) => new Set(previous).add(userId));
      try {
        await jsonFetcher(`${ADMIN_API_BASE}/users/${userId}/${action}`, {
          method: "POST",
        });
        await usersSWR.mutate();
      } catch (error) {
        alert(error instanceof Error ? error.message : "操作失败");
      } finally {
        setPendingAccessIds((previous) => {
          const next = new Set(previous);
          next.delete(userId);
          return next;
        });
      }
    },
    [canEditRoles, usersSWR],
  );
  const handleActivateUser = (userId: string) =>
    handleAccessChange(userId, "activate");
  const handleDeactivateUser = (userId: string) =>
    handleAccessChange(userId, "deactivate");
  const handlePauseUser = (userId: string) =>
    handleAccessChange(userId, "pause");
  const handleResumeUser = (userId: string) =>
    handleAccessChange(userId, "resume");

  const handleDeleteUser = useCallback(
    (userId: string) => {
      if (!canDeleteUsers) {
        return;
      }
      const targetUser = usersSWR.data?.find((item) => item.id === userId);
      setDeleteDialog({
        userId,
        email: targetUser?.email ?? userId,
        displayName:
          targetUser?.username?.trim() ||
          targetUser?.name?.trim() ||
          targetUser?.email ||
          userId,
        reason: "",
        requestId: createDeleteRequestId(),
        busy: false,
      });
    },
    [canDeleteUsers, usersSWR.data],
  );

  const handleConfirmDeleteUser = useCallback(async () => {
    if (!deleteDialog || deleteDialog.busy) {
      return;
    }
    const reason = deleteDialog.reason.trim();
    if (!reason) {
      setDeleteDialog((current) =>
        current
          ? { ...current, error: "请填写删除原因，变更会写入审计日志。" }
          : current,
      );
      return;
    }
    if (reason.length > 500) {
      setDeleteDialog((current) =>
        current ? { ...current, error: "删除原因最多 500 个字符。" } : current,
      );
      return;
    }

    const targetId = deleteDialog.userId;
    setDeleteDialog((current) =>
      current ? { ...current, busy: true, error: undefined } : current,
    );
    setPendingAccessIds((previous) => new Set(previous).add(targetId));

    try {
      await jsonFetcher(
        `${ADMIN_API_BASE}/users/${encodeURIComponent(targetId)}?reason=${encodeURIComponent(reason)}`,
        {
          method: "DELETE",
          headers: {
            "X-Request-ID": deleteDialog.requestId,
          },
        },
      );
      setDeleteDialog(undefined);
      await Promise.all([usersSWR.mutate(), metricsSWR.mutate()]);
    } catch (error) {
      setDeleteDialog((current) =>
        current
          ? {
              ...current,
              busy: false,
              error: formatDeleteUserError(error),
            }
          : current,
      );
    } finally {
      setPendingAccessIds((previous) => {
        const next = new Set(previous);
        next.delete(targetId);
        return next;
      });
    }
  }, [deleteDialog, metricsSWR, usersSWR]);

  const handleRenewUuid = useCallback(
    async (userId: string) => {
      const days = prompt("设置过期天数 (0 为永久):", "0");
      if (days === null) return;
      try {
        await jsonFetcher(`${ADMIN_API_BASE}/users/${userId}/renew-uuid`, {
          method: "POST",
          body: JSON.stringify({ expires_in_days: parseInt(days) || 0 }),
        });
        alert("UUID 已重置");
        usersSWR.mutate();
      } catch (error) {
        alert(error instanceof Error ? error.message : "操作失败");
      }
    },
    [usersSWR],
  );

  const handleCreateCustomUser = useCallback(
    async (input: CreateManagedUserInput) => {
      if (!canCreateCustomUser) {
        throw new Error("仅 root 管理员可创建自定义 UUID 用户");
      }

      await jsonFetcher(`${ADMIN_API_BASE}/users`, {
        method: "POST",
        body: JSON.stringify({
          email: input.email,
          uuid: input.uuid,
          groups: input.groups,
        }),
      });

      await usersSWR.mutate();
    },
    [canCreateCustomUser, usersSWR],
  );

  const handleSaveHomepageVideo = useCallback(
    async (payload: HomepageVideoSettingsResponse) => {
      setHomepageVideoSaving(true);
      setHomepageVideoStatus(undefined);
      setHomepageVideoError(undefined);

      try {
        const response = await fetch(`${ADMIN_API_BASE}/homepage-video`, {
          method: "PUT",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const responsePayload = (await response.json().catch(() => ({}))) as
          | HomepageVideoSettingsResponse
          | ApiError;

        if (!response.ok) {
          throw new Error(
            (responsePayload as ApiError).error ??
              (responsePayload as ApiError).message ??
              "保存失败",
          );
        }

        homepageVideoSWR.mutate(
          responsePayload as HomepageVideoSettingsResponse,
          { revalidate: false },
        );
        setHomepageVideoStatus("首页视频配置已保存");
      } catch (error) {
        setHomepageVideoError(
          error instanceof Error ? error.message : "保存失败",
        );
      } finally {
        setHomepageVideoSaving(false);
      }
    },
    [homepageVideoSWR],
  );

  const handleExportUsersCsv = useCallback(() => {
    const rows = usersSWR.data ?? [];
    const header = [
      "id",
      "email",
      "username",
      "role",
      "active",
      "groups",
      "created_at",
    ];
    const escapeCell = (val: string) =>
      val.includes(",") || val.includes('"') || val.includes("\n")
        ? `"${val.replaceAll('"', '""')}"`
        : val;
    const csv = [
      header.join(","),
      ...rows.map((item) =>
        [
          item.id,
          item.email,
          item.username ?? item.name ?? "",
          item.role ?? "user",
          String(item.active !== false),
          (item.groups ?? []).join(";"),
          item.created_at ?? "",
        ]
          .map((v) => escapeCell(String(v)))
          .join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "users-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [usersSWR.data]);

  const matrixPending = matrixSaving || isUserLoading;
  const metricsLoading = metricsSWR.isLoading;
  const settingsLoading = settingsSWR.isLoading;
  const usersLoading = usersSWR.isLoading;

  if (!canAccess) {
    return (
      <Card>
        <h1 className="text-2xl font-semibold text-gray-900">权限不足</h1>
        <p className="mt-2 text-sm text-gray-600">
          需要管理员或运维角色才能访问此页面。
        </p>
      </Card>
    );
  }

  const tabs = [
    { id: "users" as const, label: "用户管理", Icon: UsersRound },
    { id: "permissions" as const, label: "角色与权限", Icon: ShieldCheck },
    { id: "groups" as const, label: "用户组", Icon: BarChart3 },
    { id: "homepage" as const, label: "首页视频配置", Icon: Video },
    ...(user?.isRoot
      ? [{ id: "email" as const, label: emailCopy(language).tab, Icon: Mail }]
      : []),
  ];

  return (
    <div className="overflow-hidden rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)]">
      <header className="flex flex-col gap-4 border-b border-[color:var(--color-surface-border)] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--color-heading)]">
              用户管理
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              查看、管理和操作系统用户
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportUsersCsv}
              className="inline-flex h-9 items-center rounded-md border border-[color:var(--color-surface-border)] px-3 text-sm font-medium text-[var(--color-text-muted)] transition hover:bg-[var(--color-surface-hover)]"
            >
              导出用户
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("groups")}
              className="inline-flex h-9 items-center rounded-md bg-[var(--color-primary)] px-3 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-hover)] dark:bg-[var(--color-action)] dark:hover:bg-[var(--color-action-hover)]"
            >
              + 创建用户
            </button>
          </div>
        </div>
        <nav
          className="-mb-4 flex gap-1 overflow-x-auto"
          aria-label="管理工作台模块"
        >
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium transition ${
                activeTab === id
                  ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-heading)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
          {canViewAgents && (
            <Link
              href="/panel/agent"
              scroll={false}
              className="inline-flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-3 text-sm font-medium text-[var(--color-text-muted)] transition hover:text-[var(--color-heading)]"
            >
              <Server aria-hidden="true" className="h-4 w-4" />
              Agents
            </Link>
          )}
        </nav>
      </header>

      {activeTab === "users" ? (
        <>
          <MfaRecoveryReviews />
          <div className="border-b border-[color:var(--color-surface-border)] px-4 py-4 sm:px-5">
            <OverviewCards
              overview={metricsSWR.data?.overview}
              isLoading={metricsLoading}
              lastUpdatedLabel={lastUpdatedLabel}
              errorMessage={metricsSWR.error?.message}
              onRetry={() => {
                void metricsSWR.mutate();
              }}
            />
            {metricsSWR.data && !metricsSWR.error ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                用户统计已更新
                {lastUpdatedLabel ? <span>· {lastUpdatedLabel}</span> : null}
              </div>
            ) : null}
          </div>
          <UserManagementWorkspace
            users={usersSWR.data}
            isLoading={usersLoading}
            canEditRoles={canEditRoles}
            canDeleteUsers={canDeleteUsers}
            pendingUserIds={pendingRoleUpdates}
            pendingGroupIds={pendingGroupUpdates}
            groupError={groupsUpdateMessage}
            onGroupsChange={handleGroupsChange}
            onRoleChange={handleRoleChange}
            pendingAccessIds={pendingAccessIds}
            onActivateUser={handleActivateUser}
            onDeactivateUser={handleDeactivateUser}
            onPauseUser={handlePauseUser}
            onResumeUser={handleResumeUser}
            onDeleteUser={handleDeleteUser}
            onRenewUuid={handleRenewUuid}
            onExportUsers={handleExportUsersCsv}
          />
        </>
      ) : null}

      {activeTab === "permissions" ? (
        <div className="space-y-5 p-4 sm:p-5">
          <TrendChart
            series={metricsSWR.data?.series}
            isLoading={metricsLoading}
          />
          <PermissionMatrixEditor
            matrix={matrixDraft}
            roles={["user", "admin", "operator"]}
            isLoading={settingsLoading}
            isSaving={matrixPending}
            hasChanges={matrixDirty}
            statusMessage={matrixStatus}
            errorMessage={matrixError}
            onToggle={handleTogglePermission}
            onSave={handleSaveMatrix}
            canEdit={canEditPermissions}
          />
        </div>
      ) : null}

      {activeTab === "groups" ? (
        <div className="space-y-4 p-4 sm:p-5">
          {groupsUpdateMessage ? (
            <p className="text-sm text-[var(--color-danger)]">
              {groupsUpdateMessage}
            </p>
          ) : null}
          {user?.isRoot ? (
            <NetworkTeamsPanel users={usersSWR.data ?? []} />
          ) : null}
          <UserGroupManagement
            users={usersSWR.data}
            isLoading={usersLoading}
            onRoleChange={handleRoleChange}
            canEditRoles={canEditRoles}
            canCreateCustomUser={canCreateCustomUser}
            pendingUserIds={pendingRoleUpdates}
            onPauseUser={handlePauseUser}
            onResumeUser={handleResumeUser}
            onDeleteUser={handleDeleteUser}
            onRenewUuid={handleRenewUuid}
            onCreateCustomUser={handleCreateCustomUser}
            onManageBlacklist={() => setIsBlacklistOpen(true)}
            onGroupsChange={handleGroupsChange}
            onPlanGroupPreview={handlePlanGroupPreview}
            onPlanGroupApply={handlePlanGroupApply}
            onSubscriptionRecordsImport={
              canManageSubscriptions
                ? handleSubscriptionRecordsImport
                : undefined
            }
            onSubscriptionRecordsExport={
              canManageSubscriptions
                ? handleSubscriptionRecordsExport
                : undefined
            }
            pendingGroupUserIds={pendingGroupUpdates}
          />
        </div>
      ) : null}

      {activeTab === "homepage" ? (
        <div className="p-4 sm:p-5">
          <HomepageVideoSettingsPanel
            settings={homepageVideoSWR.data}
            isLoading={homepageVideoSWR.isLoading}
            isSaving={homepageVideoSaving}
            canEdit={canEditPermissions}
            statusMessage={homepageVideoStatus}
            errorMessage={homepageVideoError}
            onSave={handleSaveHomepageVideo}
          />
        </div>
      ) : null}

      {activeTab === "email" && user?.isRoot ? (
        <div className="p-4 sm:p-5">
          <EmailManagementPanel />
        </div>
      ) : null}

      <EmailBlacklist
        isOpen={isBlacklistOpen}
        onClose={() => setIsBlacklistOpen(false)}
      />

      <DeleteUserDialog
        target={deleteDialog}
        onReasonChange={(reason) =>
          setDeleteDialog((current) =>
            current
              ? {
                  ...current,
                  reason,
                  requestId: createDeleteRequestId(),
                  error: undefined,
                }
              : current,
          )
        }
        onClose={() => {
          setDeleteDialog((current) => (current?.busy ? current : undefined));
        }}
        onConfirm={() => {
          void handleConfirmDeleteUser();
        }}
      />
    </div>
  );
}
