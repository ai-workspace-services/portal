"use client";

import useSWR from "swr";
import { fetchRegionalPools, type RegionalPool } from "../lib/regionalPools";

import { useLanguage } from "@i18n/LanguageProvider";
import { NodesTable } from "../components/xds/AccountPanels";

export default function UserCenterAgentRoute() {
  const { language } = useLanguage();
  const { data, isLoading, error } = useSWR<RegionalPool[]>(
    "user-center-regional-pools",
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
