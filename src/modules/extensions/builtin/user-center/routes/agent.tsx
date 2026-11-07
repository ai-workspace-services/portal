"use client";

import useSWR from "swr";
import AgentInventory from "../management/components/AgentInventory";
import TeamAgentEnrollments from "../components/TeamAgentEnrollments";
import { fetchRegionalPools, type RegionalPool } from "../lib/regionalPools";

import { useLanguage } from "@i18n/LanguageProvider";
import { resolveAccess } from "@lib/accessControl";
import { useUserStore } from "@lib/userStore";
import { NodesTable } from "../components/xds/AccountPanels";

export default function UserCenterAgentRoute() {
  const { language } = useLanguage();
  const account = useUserStore((state) => state.user);
  const accessDecision = resolveAccess(account, {
    requireLogin: true,
    roles: ["admin", "operator"],
    permissions: ["admin.agents.status.read"],
  });
  const canInspectAgents =
    Boolean(account?.isAdmin || account?.isRoot || account?.isOperator) ||
    accessDecision.userRole === "admin" ||
    accessDecision.userRole === "operator";
  const canManageGrants =
    Boolean(account?.isAdmin || account?.isRoot) ||
    accessDecision.userRole === "admin";

  const { data, isLoading, error } = useSWR<RegionalPool[]>(
    account
      ? ["user-center-regional-pools", account.id, Boolean(account.isRoot)]
      : null,
    fetchRegionalPools,
    { refreshInterval: 30_000 },
  );

  return (
    <div className="xds space-y-6" style={{ background: "transparent" }}>
      {account && canInspectAgents ? (
        <AgentInventory
          accountId={account.id}
          language={language}
          canManage={canManageGrants}
        />
      ) : (
        <div className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-6">
          <h1 className="text-xl font-semibold text-[var(--color-heading)]">
            {language === "zh" ? "权限不足" : "Access Denied"}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            {language === "zh"
              ? "需要管理员或运维角色才能访问 Agent 集中管理控制台。"
              : "Administrative or operational role is required to access the Agent management console."}
          </p>
        </div>
      )}
      {account && canInspectAgents ? (
        <>
          <NodesTable
            zh={language === "zh"}
            pools={error ? [] : (data ?? [])}
            isLoading={isLoading}
            error={error}
          />
          <TeamAgentEnrollments zh={language === "zh"} />
        </>
      ) : null}
    </div>
  );
}
