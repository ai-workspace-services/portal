"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
} from "lucide-react";

import { XdsBadge, XdsButton, XdsCard, XdsCardBody, XdsCardHead } from "@/components/ui/xds";
import {
  DEFAULT_GITOPS_TARGET,
  DEFAULT_ROUTING_POLICY_YAML,
  parseAndValidateRoutingPolicy,
  syncRoutingPolicy,
  type GitOpsPolicyTarget,
  type RoutingPolicySyncResponse,
} from "../lib/routingPolicy";

type EditorFormat = "yaml" | "json";

export interface GatewayRoutingPolicyCardProps {
  zh?: boolean;
  initialYaml?: string;
  initialTarget?: Partial<GitOpsPolicyTarget>;
  sourceLabel?: string;
  onSyncPolicy?: typeof syncRoutingPolicy;
}

export default function GatewayRoutingPolicyCard({
  zh = true,
  initialYaml = DEFAULT_ROUTING_POLICY_YAML,
  initialTarget,
  sourceLabel,
  onSyncPolicy = syncRoutingPolicy,
}: GatewayRoutingPolicyCardProps) {
  const [format, setFormat] = useState<EditorFormat>("yaml");
  const [editorText, setEditorText] = useState(initialYaml);
  const [target, setTarget] = useState<GitOpsPolicyTarget>(() => ({
    repository:
      initialTarget?.repository || DEFAULT_GITOPS_TARGET.repository,
    branch: initialTarget?.branch || DEFAULT_GITOPS_TARGET.branch,
    path: initialTarget?.path || DEFAULT_GITOPS_TARGET.path,
    commitMessage:
      initialTarget?.commitMessage || DEFAULT_GITOPS_TARGET.commitMessage,
  }));
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<RoutingPolicySyncResponse | null>(
    null,
  );
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    setEditorText(initialYaml);
    setFormat("yaml");
  }, [initialYaml]);

  useEffect(() => {
    if (!initialTarget) return;
    setTarget((prev) => ({
      repository: initialTarget.repository || prev.repository,
      branch: initialTarget.branch || prev.branch,
      path: initialTarget.path || prev.path,
      commitMessage: initialTarget.commitMessage || prev.commitMessage,
    }));
  }, [initialTarget]);

  const validation = useMemo(
    () => parseAndValidateRoutingPolicy(editorText),
    [editorText],
  );

  const handleFormatSwitch = useCallback(
    (nextFormat: EditorFormat) => {
      if (nextFormat === format) return;
      if (validation.valid) {
        setEditorText(
          nextFormat === "json"
            ? validation.normalizedJson
            : validation.normalizedYaml,
        );
      }
      setFormat(nextFormat);
    },
    [format, validation.normalizedJson, validation.normalizedYaml, validation.valid],
  );

  const handleReset = useCallback(() => {
    setFormat("yaml");
    setEditorText(DEFAULT_ROUTING_POLICY_YAML);
    setSyncResult(null);
    setSyncError(null);
  }, []);

  const handleSubmit = useCallback(
    async (dryRun: boolean) => {
      if (!validation.valid) return;
      setSyncing(true);
      setSyncError(null);
      try {
        const result = await onSyncPolicy({
          content: validation.normalizedYaml,
          repository: target.repository.trim(),
          branch: target.branch.trim(),
          path: target.path.trim(),
          commitMessage: target.commitMessage.trim(),
          dryRun,
        });
        setSyncResult(result);
      } catch (error) {
        setSyncError(
          error instanceof Error
            ? error.message
            : zh
              ? "GitOps 同步失败"
              : "GitOps sync failed",
        );
      } finally {
        setSyncing(false);
      }
    },
    [onSyncPolicy, target, validation.normalizedYaml, validation.valid, zh],
  );

  return (
    <XdsCard id="xds-gateway-gitops">
      <XdsCardHead
        title={
          <span className="inline-flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
            {zh ? "GitOps 路由策略同步" : "GitOps Routing Policy Sync"}
          </span>
        }
        description={
          zh
            ? "编辑三层分流 proxy-groups（Media-Pool / Pro-EC2-Pool）与规则集，并提交同步至 GitOps 配置仓库。"
            : "Edit three-tier proxy-groups (Media-Pool / Pro-EC2-Pool) and rules YAML/JSON, then sync to the GitOps repository."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {sourceLabel ? (
              <XdsBadge tone="info" dot={false}>
                {sourceLabel}
              </XdsBadge>
            ) : null}
            <XdsBadge tone={validation.valid ? "success" : "danger"}>
              {validation.valid
                ? zh
                  ? "策略校验通过"
                  : "Valid policy"
                : zh
                  ? "存在校验错误"
                  : "Invalid policy"}
            </XdsBadge>
          </div>
        }
      />
      <XdsCardBody className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-[var(--color-text-muted)]">
            {zh ? "Git 仓库" : "Git repository"}
            <input
              type="text"
              value={target.repository}
              onChange={(event) =>
                setTarget((prev) => ({ ...prev, repository: event.target.value }))
              }
              className="mt-1.5 w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </label>
          <label className="text-xs font-medium text-[var(--color-text-muted)]">
            {zh ? "目标分支" : "Branch"}
            <input
              type="text"
              value={target.branch}
              onChange={(event) =>
                setTarget((prev) => ({ ...prev, branch: event.target.value }))
              }
              className="mt-1.5 w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </label>
          <label className="text-xs font-medium text-[var(--color-text-muted)]">
            {zh ? "策略文件路径" : "Policy file path"}
            <input
              type="text"
              value={target.path}
              onChange={(event) =>
                setTarget((prev) => ({ ...prev, path: event.target.value }))
              }
              className="mt-1.5 w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </label>
          <label className="text-xs font-medium text-[var(--color-text-muted)]">
            {zh ? "提交说明" : "Commit message"}
            <input
              type="text"
              value={target.commitMessage}
              onChange={(event) =>
                setTarget((prev) => ({
                  ...prev,
                  commitMessage: event.target.value,
                }))
              }
              className="mt-1.5 w-full rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
                {zh ? "策略声明编辑器" : "Policy declaration editor"}
              </span>
              <div
                className="inline-flex rounded-md border border-[color:var(--color-surface-border)] p-0.5"
                role="group"
                aria-label={zh ? "编辑格式切换" : "Editor format switch"}
              >
                {(["yaml", "json"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={format === item}
                    onClick={() => handleFormatSwitch(item)}
                    className={`rounded px-2.5 py-1 text-xs font-semibold uppercase transition ${
                      format === item
                        ? "bg-[var(--color-primary)] text-white"
                        : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              aria-label={
                zh ? "路由策略 YAML/JSON 编辑器" : "Routing policy YAML/JSON editor"
              }
              value={editorText}
              onChange={(event) => {
                setEditorText(event.target.value);
                setSyncResult(null);
                setSyncError(null);
              }}
              rows={18}
              spellCheck={false}
              className="w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface-subtle)] p-3 font-mono text-xs leading-5 text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface-subtle)] p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
                {zh ? "Proxy-Groups 三层池预览" : "Proxy-Groups Preview"}
              </h3>
              <div className="mt-2.5 space-y-2">
                {validation.proxyGroups.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {zh ? "暂无可解析的分流池" : "No proxy-groups parsed"}
                  </p>
                ) : (
                  validation.proxyGroups.map((group) => (
                    <div
                      key={group.name}
                      className="rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-[var(--color-heading)]">
                          {group.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <XdsBadge
                            tone={
                              group.mediaOnProAction === "blackhole"
                                ? "danger"
                                : "success"
                            }
                            dot={false}
                          >
                            {group.mediaOnProAction === "blackhole"
                              ? "mediaOnProAction: blackhole"
                              : "media: allow"}
                          </XdsBadge>
                          <XdsBadge tone="neutral" dot={false}>
                            {group.nodes.length} nodes
                          </XdsBadge>
                        </div>
                      </div>
                      {group.pricingGroups.length > 0 ? (
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                          5+1: {group.pricingGroups.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface-subtle)] p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-subtle)]">
                  {zh ? "分流规则预览" : "Rules Preview"}
                </h3>
                <span className="font-mono text-xs text-[var(--color-text-muted)]">
                  {validation.rules.length} rules
                </span>
              </div>
              <pre className="mt-2 max-h-48 overflow-auto rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-2.5 font-mono text-xs leading-5 text-[var(--color-text)]">
                {validation.rules.length > 0
                  ? validation.rules.join("\n")
                  : zh
                    ? "# 暂无有效规则"
                    : "# No rules"}
              </pre>
            </div>
          </div>
        </div>

        {validation.errors.length > 0 ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
          >
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              {zh ? "策略校验错误" : "Policy validation errors"}
            </div>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              {validation.errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {validation.warnings.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {zh ? "策略安全提示" : "Policy warnings"}
            </div>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              {validation.warnings.map((warn) => (
                <li key={warn}>{warn}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {syncError ? (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
          >
            {syncError}
          </div>
        ) : null}

        {syncResult ? (
          <div
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900"
          >
            <div className="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {syncResult.message}
            </div>
            <p className="mt-1 font-mono text-xs text-emerald-800">
              {syncResult.target.repository}@{syncResult.target.branch}:
              {syncResult.target.path} · mode={syncResult.mode}
              {syncResult.commitSha ? ` · sha=${syncResult.commitSha}` : ""}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-surface-border)] pt-4">
          <XdsButton size="sm" variant="ghost" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {zh ? "重置规范模板" : "Reset canonical template"}
          </XdsButton>
          <div className="flex flex-wrap items-center gap-2">
            <XdsButton
              size="sm"
              variant="secondary"
              disabled={!validation.valid || syncing}
              onClick={() => void handleSubmit(true)}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              {zh ? "校验并 Dry-Run" : "Validate (Dry Run)"}
            </XdsButton>
            <XdsButton
              size="sm"
              variant="primary"
              disabled={!validation.valid || syncing}
              onClick={() => void handleSubmit(false)}
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {syncing
                ? zh
                  ? "同步中…"
                  : "Syncing…"
                : zh
                  ? "同步至 GitOps 仓库"
                  : "Sync to GitOps repo"}
            </XdsButton>
          </div>
        </div>
      </XdsCardBody>
    </XdsCard>
  );
}
