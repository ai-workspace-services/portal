"use client";

import { RefreshCw, Server, ShieldCheck } from "lucide-react";
import useSWR from "swr";

import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";

import Card from "./Card";
import VlessQrCard from "./VlessQrCard";
import { fetchAgentNodes } from "../lib/fetchAgentNodes";
import type { VlessNode } from "../lib/vless";

interface AccountConnectionsPanelProps {
  uuid: string | null;
}

function formatProtocols(protocols?: string | string[]): string {
  if (Array.isArray(protocols)) return protocols.join(", ");
  return protocols || "—";
}

function visibleNode(node: VlessNode): boolean {
  const name = (node.name || "").toLowerCase();
  const address = (node.address || "").trim();
  return Boolean(
    address &&
    address !== "*" &&
    !(name.includes("internal agents") && name.includes("shared token")),
  );
}

export default function AccountConnectionsPanel({
  uuid,
}: AccountConnectionsPanelProps) {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const copy = translations[language].userCenter.overview.cards.vless;
  const { data, error, isLoading, mutate } = useSWR<VlessNode[]>(
    "user-center-agent-nodes",
    fetchAgentNodes,
  );
  const nodes = (data ?? []).filter(visibleNode);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
      <Card className="h-full">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Server
                className="h-4 w-4 text-[var(--color-primary)]"
                aria-hidden="true"
              />
              <h3 className="text-base font-semibold text-[var(--color-heading)]">
                {isChinese ? "运行节点" : "Runtime nodes"}
              </h3>
              <span className="rounded-full bg-[var(--color-primary-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--color-primary)]">
                {nodes.length}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--color-text-subtle)]">
              {isChinese
                ? "节点配置来自 agent API；未返回的健康指标保持为空。"
                : "Node configuration from the agent API; unavailable health metrics stay empty."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--color-surface-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-text-subtle)] transition-colors hover:border-[color:var(--color-primary-border)] hover:text-[var(--color-primary)]"
            aria-label={isChinese ? "刷新节点" : "Refresh nodes"}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {isChinese ? "刷新" : "Refresh"}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-[color:var(--color-danger-border)] bg-[var(--color-danger-muted)]/30 p-3 text-sm text-[var(--color-danger-foreground)]">
            {isChinese
              ? `节点加载失败：${error.message}`
              : `Unable to load nodes: ${error.message}`}
          </div>
        ) : null}

        {isLoading && !data ? (
          <div
            className="mt-4 space-y-3"
            aria-label={isChinese ? "节点加载中" : "Loading nodes"}
          >
            {[1, 2].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-muted)]"
              />
            ))}
          </div>
        ) : nodes.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/30 p-5 text-sm text-[var(--color-text-subtle)]">
            {isChinese
              ? "暂无可用节点配置。"
              : "No node configuration is available."}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {nodes.map((node) => (
              <article
                key={`${node.address}-${node.name}`}
                className="rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-[var(--color-heading)]">
                      {node.name || node.address}
                    </h4>
                    <p className="mt-1 truncate font-mono text-xs text-[var(--color-text-subtle)]">
                      {node.address}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-primary-muted)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                    {node.transport || "—"}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-[var(--color-text-subtle)]">
                      {isChinese ? "服务名" : "Server name"}
                    </dt>
                    <dd className="mt-0.5 truncate text-[var(--color-text)]">
                      {node.server_name || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-subtle)]">
                      {isChinese ? "端口" : "Ports"}
                    </dt>
                    <dd className="mt-0.5 text-[var(--color-text)]">
                      {[node.xhttp_port, node.tcp_port, node.port]
                        .filter(
                          (port, index, ports) =>
                            typeof port === "number" &&
                            ports.indexOf(port) === index,
                        )
                        .join(" / ") || "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[var(--color-text-subtle)]">
                      {isChinese ? "协议" : "Protocols"}
                    </dt>
                    <dd className="mt-0.5 truncate text-[var(--color-text)]">
                      {formatProtocols(node.protocols)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </Card>

      <VlessQrCard uuid={uuid} copy={copy} />
    </div>
  );
}
