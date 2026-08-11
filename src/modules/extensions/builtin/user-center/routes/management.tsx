"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";

import Card from "../components/Card";
import TrendChart, {
  type MetricsSeries,
} from "../management/components/TrendChart";
import OverviewCards, {
  type MetricsOverview,
} from "../management/components/OverviewCards";
import PermissionMatrixEditor, {
  type PermissionMatrix,
} from "../management/components/PermissionMatrixEditor";
import UserGroupManagement, {
  type ManagedUser,
  type CreateManagedUserInput,
} from "../management/components/UserGroupManagement";
import HomepageVideoSettingsPanel from "../management/components/HomepageVideoSettingsPanel";
import { EmailBlacklist } from "../management/components/EmailBlacklist";
import Breadcrumbs from "@/app/panel/components/Breadcrumbs";
import { resolveAccess } from "@lib/accessControl";
import type { HomepageVideoSettingsResponse } from "@/lib/home/homepageVideo";
import { useUserStore } from "@lib/userStore";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";

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
    const message = payload?.error ?? payload?.message ?? response.statusText;
    throw new Error(message || "请求失败");
  }

  return (await response.json()) as T;
}

export default function UserCenterManagementRoute() {
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
  const canEditPermissions = Boolean(user?.isAdmin);
  const canEditRoles = Boolean(user?.isAdmin);
  const canCreateCustomUser = Boolean(
    user?.isAdmin && user?.email?.trim().toLowerCase() === "admin@svc.plus",
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
  const [pendingGroupUpdates, setPendingGroupUpdates] = useState<
    Set<string>
  >(new Set());
  const [groupsUpdateMessage, setGroupsUpdateMessage] = useState<
    string | undefined
  >();
  const [isBlacklistOpen, setIsBlacklistOpen] = useState(false);
  const [homepageVideoSaving, setHomepageVideoSaving] = useState(false);
  const [homepageVideoStatus, setHomepageVideoStatus] = useState<
    string | undefined
  >();
  const [homepageVideoError, setHomepageVideoError] = useState<
    string | undefined
  >();

  const metricsSWR = useSWR<UserMetricsResponse>(
    canAccess ? "/api/admin/users/metrics" : null,
    jsonFetcher,
    {
      revalidateOnFocus: false,
    },
  );
  const settingsSWR = useSWR<AdminSettingsResponse>(
    canAccess ? "/api/admin/settings" : null,
    jsonFetcher,
    {
      revalidateOnFocus: false,
    },
  );
  const usersSWR = useSWR<ManagedUser[]>(
    canAccess ? "/api/users" : null,
    jsonFetcher,
    {
      revalidateOnFocus: false,
    },
  );
  const homepageVideoSWR = useSWR<HomepageVideoSettingsResponse>(
    canAccess ? "/api/admin/homepage-video" : null,
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
      const response = await fetch("/api/admin/settings", {
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
        await jsonFetcher(`/api/admin/users/${userId}/groups`, {
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

  const handleRoleChange = useCallback(
    async (userId: string, role: string) => {
      if (!canEditRoles) {
        return;
      }
      setRoleUpdateMessage(undefined);
      markRolePending(userId, true);
      try {
        await jsonFetcher(`/api/admin/users/${userId}/role`, {
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
        await jsonFetcher(`/api/admin/users/${userId}/role`, {
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

  const handlePauseUser = useCallback(
    async (userId: string) => {
      try {
        await jsonFetcher(`/api/admin/users/${userId}/pause`, {
          method: "POST",
        });
        usersSWR.mutate();
      } catch (error) {
        alert(error instanceof Error ? error.message : "操作失败");
      }
    },
    [usersSWR],
  );

  const handleResumeUser = useCallback(
    async (userId: string) => {
      try {
        await jsonFetcher(`/api/admin/users/${userId}/resume`, {
          method: "POST",
        });
        usersSWR.mutate();
      } catch (error) {
        alert(error instanceof Error ? error.message : "操作失败");
      }
    },
    [usersSWR],
  );

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      try {
        await jsonFetcher(`/api/admin/users/${userId}`, { method: "DELETE" });
        usersSWR.mutate();
      } catch (error) {
        alert(error instanceof Error ? error.message : "操作失败");
      }
    },
    [usersSWR],
  );

  const handleRenewUuid = useCallback(
    async (userId: string) => {
      const days = prompt("设置过期天数 (0 为永久):", "0");
      if (days === null) return;
      try {
        await jsonFetcher(`/api/admin/users/${userId}/renew-uuid`, {
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

      await jsonFetcher("/api/admin/users", {
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
        const response = await fetch("/api/admin/homepage-video", {
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

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: t.items.dashboard, href: "/panel" },
          {
            label: translations[language].nav.account.management,
            href: "/panel/management",
          },
        ]}
      />
      <OverviewCards
        overview={metricsSWR.data?.overview}
        isLoading={metricsLoading}
        lastUpdatedLabel={lastUpdatedLabel}
      />
      <TrendChart series={metricsSWR.data?.series} isLoading={metricsLoading} />
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
      <HomepageVideoSettingsPanel
        settings={homepageVideoSWR.data}
        isLoading={homepageVideoSWR.isLoading}
        isSaving={homepageVideoSaving}
        canEdit={canEditPermissions}
        statusMessage={homepageVideoStatus}
        errorMessage={homepageVideoError}
        onSave={handleSaveHomepageVideo}
      />
      {groupsUpdateMessage ? (
        <p className="text-sm text-red-600">{groupsUpdateMessage}</p>
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
        pendingGroupUserIds={pendingGroupUpdates}
      />
      <EmailBlacklist
        isOpen={isBlacklistOpen}
        onClose={() => setIsBlacklistOpen(false)}
      />
    </div>
  );
}
