"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Copy, Download, QrCode } from "lucide-react";
import { toDataURL } from "qrcode";
import useSWR from "swr";

import Card from "./Card";
import {
  buildVlessConfig,
  buildVlessUri,
  serializeConfigForDownload,
  VlessNode,
  VlessTransport,
} from "../lib/vless";
import { fetchAgentNodes } from "../lib/fetchAgentNodes";

export type VlessQrCopy = {
  label: string;
  description: string;
  linkLabel: string;
  linkHelper: string;
  copyLink: string;
  copied: string;
  downloadQr: string;
  generating: string;
  error: string;
  missingUuid: string;
  qrAlt: string;
};

interface VlessQrCardProps {
  uuid: string | null | undefined;
  copy: VlessQrCopy;
  defaultTransport?: VlessTransport;
  visibleTransports?: VlessTransport[];
  className?: string;
}

const DEFAULT_TRANSPORT: VlessTransport = "xhttp";
const DEFAULT_VISIBLE_TRANSPORTS: VlessTransport[] = ["xhttp"];

function normalizeVisibleTransports(
  transports?: VlessTransport[],
): VlessTransport[] {
  const visible = (transports ?? DEFAULT_VISIBLE_TRANSPORTS).filter(
    (transport, index, values) => values.indexOf(transport) === index,
  );

  return visible.length > 0 ? visible : DEFAULT_VISIBLE_TRANSPORTS;
}

function resolveInitialTransport(
  defaultTransport: VlessTransport | undefined,
  visibleTransports: VlessTransport[],
): VlessTransport {
  if (defaultTransport && visibleTransports.includes(defaultTransport)) {
    return defaultTransport;
  }

  return visibleTransports[0] ?? DEFAULT_TRANSPORT;
}

export default function VlessQrCard({
  uuid,
  copy,
  defaultTransport,
  visibleTransports,
  className,
}: VlessQrCardProps) {
  const { data: allNodes, error: nodesError } = useSWR<VlessNode[]>(
    "user-center-agent-nodes",
    fetchAgentNodes,
  );

  const transportOptions = useMemo(
    () => normalizeVisibleTransports(visibleTransports),
    [visibleTransports],
  );

  const nodes = useMemo(() => {
    return (allNodes ?? []).filter((node) => {
      const name = (node.name || "").toLowerCase();
      const address = (node.address || "").trim();
      if (!address || address === "*") return false;

      // Skip the redundant Internal Agents (Shared Token) node
      return !(
        name.includes("internal agents") && name.includes("shared token")
      );
    });
  }, [allNodes]);
  const [selectedNode, setSelectedNode] = useState<VlessNode | null>(null);
  const [preferredTransport, setPreferredTransport] = useState<VlessTransport>(
    () => resolveInitialTransport(defaultTransport, transportOptions),
  );
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPreferredTransport((currentTransport) => {
      if (transportOptions.includes(currentTransport)) {
        return currentTransport;
      }

      return resolveInitialTransport(defaultTransport, transportOptions);
    });
  }, [defaultTransport, transportOptions]);

  const rawNode = useMemo(() => {
    if (selectedNode) return selectedNode;

    // Default to the first visible (non-filtered) node.
    if (nodes && nodes[0]) return nodes[0];

    return undefined;
  }, [nodes, selectedNode]);

  const effectiveNode = useMemo((): VlessNode | undefined => {
    if (!rawNode) return undefined;

    const isXhttp = preferredTransport === "xhttp";
    const xhttpPort =
      typeof rawNode.xhttp_port === "number" && rawNode.xhttp_port > 0
        ? rawNode.xhttp_port
        : rawNode.transport === "xhttp" &&
            typeof rawNode.port === "number" &&
            rawNode.port > 0
          ? rawNode.port
          : 443;
    const tcpPort =
      typeof rawNode.tcp_port === "number" && rawNode.tcp_port > 0
        ? rawNode.tcp_port
        : rawNode.transport === "tcp" &&
            typeof rawNode.port === "number" &&
            rawNode.port > 0
          ? rawNode.port
          : 1443;

    return {
      ...rawNode,
      transport: preferredTransport,
      port: isXhttp ? xhttpPort : tcpPort,
      xhttp_port: xhttpPort,
      tcp_port: tcpPort,
      server_name: rawNode.server_name || rawNode.address,
      path: isXhttp ? rawNode.path || "/split" : undefined,
      mode: isXhttp ? rawNode.mode || "auto" : undefined,
      flow: rawNode.flow || "xtls-rprx-vision",
    };
  }, [rawNode, preferredTransport]);

  const vlessUri = useMemo(
    () => buildVlessUri(uuid, effectiveNode),
    [uuid, effectiveNode],
  );

  useEffect(() => {
    let cancelled = false;

    if (!vlessUri) {
      setQrDataUrl(null);
      setGenerationError(null);
      return () => {
        cancelled = true;
      };
    }

    setIsGenerating(true);
    setGenerationError(null);
    toDataURL(vlessUri, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 8,
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("Failed to generate VLESS QR code", error);
          setGenerationError(copy.error);
          setQrDataUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsGenerating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [copy.error, vlessUri]);

  const handleCopyLink = useCallback(async () => {
    if (!vlessUri) {
      return;
    }

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        "writeText" in navigator.clipboard
      ) {
        await navigator.clipboard.writeText(vlessUri);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = vlessUri;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.warn("Failed to copy VLESS link", error);
    }
  }, [vlessUri]);

  const handleDownloadQr = useCallback(() => {
    if (!qrDataUrl) {
      return;
    }

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `vless-${effectiveNode?.name || "qr"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrDataUrl, effectiveNode?.name]);

  const isReady = Boolean(vlessUri && qrDataUrl && !generationError);
  const isDisabled = !vlessUri;

  return (
    <Card className={className}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                {copy.label}
              </p>
              <span className="rounded-full bg-[var(--color-primary-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                {effectiveNode?.name || effectiveNode?.address || "Node"}
              </span>
            </div>
            <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
              {copy.description}
            </p>
          </div>

          {nodes && nodes.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                className="inline-flex items-center gap-1 rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
              >
                切换节点
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${isSelectorOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isSelectorOpen && (
                <div className="absolute right-0 top-full z-10 mt-1 w-48 overflow-hidden rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-lg ring-1 ring-black ring-opacity-5">
                  <div className="max-h-60 overflow-y-auto py-1">
                    {nodes.map((node) => (
                      <button
                        key={node.address}
                        type="button"
                        onClick={() => {
                          setSelectedNode(node);
                          setIsSelectorOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-[var(--color-text)] hover:bg-[var(--color-primary-muted)]"
                      >
                        <span>{node.name}</span>
                        {(selectedNode?.address === node.address ||
                          (!selectedNode && node === nodes[0])) && (
                          <Check className="h-3 w-3 text-[var(--color-primary)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {transportOptions.map((transport) => (
            <button
              key={transport}
              type="button"
              onClick={() => setPreferredTransport(transport)}
              className={`rounded-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                preferredTransport === transport
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-border)]"
              }`}
            >
              {transport}
            </button>
          ))}
        </div>

        {!uuid ? (
          <div className="rounded-md border border-[color:var(--color-warning-border)] bg-[var(--color-warning-muted)] p-3 text-xs text-[var(--color-warning-foreground)]">
            <p className="font-semibold">❌ UUID 缺失</p>
            <p className="mt-1">{copy.missingUuid}</p>
          </div>
        ) : (!nodes || nodes.length === 0) && !rawNode ? (
          <div className="rounded-md border border-[color:var(--color-warning-border)] bg-[var(--color-warning-muted)] p-3 text-xs text-[var(--color-warning-foreground)]">
            <p className="font-semibold">❌ 运行节点配置缺失</p>
            <p className="mt-1">
              {`无法从服务器获取代理节点列表${nodesError ? `（${nodesError.message}）` : ""}。请检查 API 接口是否正常。`}
            </p>
          </div>
        ) : !effectiveNode ? (
          <div className="rounded-md border border-[color:var(--color-warning-border)] bg-[var(--color-warning-muted)] p-3 text-xs text-[var(--color-warning-foreground)]">
            <p className="font-semibold">❌ 有效节点缺失</p>
            <p className="mt-1">节点数据存在但无法解析。请联系管理员。</p>
          </div>
        ) : !effectiveNode.transport ? (
          <div className="rounded-md border border-[color:var(--color-warning-border)] bg-[var(--color-warning-muted)] p-3 text-xs text-[var(--color-warning-foreground)]">
            <p className="font-semibold">❌ Transport 类型缺失</p>
            <p className="mt-1">
              节点 {effectiveNode.name || effectiveNode.address} 缺少 transport
              字段。
            </p>
          </div>
        ) : !vlessUri ? (
          <div className="rounded-md border border-[color:var(--color-warning-border)] bg-[var(--color-warning-muted)] p-3 text-xs text-[var(--color-warning-foreground)]">
            <p className="font-semibold">❌ URI Scheme 缺失</p>
            <p className="mt-1">
              节点 {effectiveNode.name || effectiveNode.address} 缺少{" "}
              {preferredTransport === "tcp"
                ? "uri_scheme_tcp"
                : "uri_scheme_xhttp"}{" "}
              字段。 请确保 accounts.svc.plus 正确返回 URI scheme 模板。
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex h-40 w-40 items-center justify-center overflow-hidden rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)]">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center gap-2 text-center text-xs text-[var(--color-text-subtle)]">
                    <QrCode className="h-6 w-6 opacity-60" />
                    <span>{copy.generating}</span>
                  </div>
                ) : generationError ? (
                  <div className="px-4 text-center text-xs text-[var(--color-text-subtle)]">
                    {generationError}
                  </div>
                ) : qrDataUrl ? (
                  <Image
                    src={qrDataUrl}
                    alt={copy.qrAlt}
                    width={160}
                    height={160}
                    unoptimized
                    className="h-full w-full object-contain"
                  />
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-2 text-xs text-[var(--color-text-subtle)]">
                <div className="rounded-[var(--radius-lg)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] p-3 text-[11px] text-[var(--color-text)]">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
                    {copy.linkLabel}
                  </p>
                  <p className="font-mono text-xs text-[var(--color-text-subtle)]">
                    {copy.linkHelper}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={isDisabled}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[color:var(--color-primary-border)] px-4 py-2 text-sm font-medium text-[var(--color-primary)] transition-colors hover:border-[color:var(--color-primary)] hover:bg-[var(--color-primary-muted)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? copy.copied : copy.copyLink}
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                disabled={!isReady}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {copy.downloadQr}
              </button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
