"use client";

import useSWR from "swr";
import { fetchRegionalPools, type RegionalPool } from "../lib/regionalPools";

import { useLanguage } from "@i18n/LanguageProvider";
import { useUserStore } from "@lib/userStore";
import { NodesTable } from "../components/xds/AccountPanels";

export default function UserCenterAgentRoute() {
  const { language } = useLanguage();
  const account = useUserStore((state) => state.user);
  const { data, isLoading, error } = useSWR<RegionalPool[]>(
    account
      ? ["user-center-regional-pools", account.id, Boolean(account.isRoot)]
      : null,
    fetchRegionalPools,
    { refreshInterval: 30_000 },
  );
  return (
    <div className="xds" style={{ background: "transparent" }}>
      <NodesTable
        zh={language === "zh"}
        pools={error ? [] : (data ?? [])}
        isLoading={isLoading}
        error={error}
      />
    </div>
  );
}
