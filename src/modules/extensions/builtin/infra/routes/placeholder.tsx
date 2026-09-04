"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowRight,
  Database,
  KeyRound,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  OpenClawAssistantPane,
  type OpenClawAssistantViewState,
} from "@/components/openclaw/OpenClawAssistantPane";
import type { IntegrationDefaults } from "@/lib/openclaw/types";
import { cn } from "@/lib/utils";

type WorkspaceKind = "deployments" | "resources" | "logs" | "api-keys";

type WorkspaceConfig = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  prompts: string[];
  suggestions: string[];
};

const EMPTY_DEFAULTS: IntegrationDefaults = {
  openclawUrl: "",
  openclawOrigin: "",
  openclawTokenConfigured: false,
  vaultUrl: "",
  vaultNamespace: "",
  vaultTokenConfigured: false,
  vaultSecretPath: "",
  vaultSecretKey: "",
  apisixUrl: "",
  apisixTokenConfigured: false,
};

function getWorkspaceKind(pathname: string): WorkspaceKind {
  if (pathname.includes("/resources")) {
    return "resources";
  }
  if (pathname.includes("/observability")) {
    return "logs";
  }
  if (pathname.includes("/api-keys")) {
    return "api-keys";
  }
  return "deployments";
}

function getWorkspaceConfig(kind: WorkspaceKind): WorkspaceConfig {
  switch (kind) {
    case "resources":
      return {
        title: "Resources",
        subtitle: "让 X 助手整理资源盘点、实例状态和依赖关系，结果在这里持续展开。",
        icon: Database,
        accent: "R",
        prompts: [
          "盘点当前资源并按环境分组",
          "列出数据库实例与风险项",
          "整理资源依赖关系和下一步动作",
        ],
        suggestions: [
          "资源清单",
          "实例状态",
          "风险摘要",
        ],
      };
    case "logs":
      return {
        title: "Observability",
        subtitle: "把监控、日志与 AI 分析集中到同一个中间结果区，不再停留在空白页。",
        icon: Activity,
        accent: "O",
        prompts: [
          "分析最近异常日志并归类",
          "总结监控异常和修复建议",
          "按时间线梳理今天的可观测性事件",
        ],
        suggestions: [
          "指标概览",
          "日志分析",
          "修复建议",
        ],
      };
    case "api-keys":
      return {
        title: "API Keys",
        subtitle: "把接口密钥、访问凭证和安全引用整理成可交互的工作区结果。",
        icon: KeyRound,
        accent: "K",
        prompts: [
          "梳理当前密钥用途与系统归属",
          "列出需要轮换的访问凭证",
          "生成密钥治理检查清单",
        ],
        suggestions: [
          "凭证盘点",
          "轮换建议",
          "治理清单",
        ],
      };
    default:
      return {
        title: "Deployments",
        subtitle: "部署任务、发布状态和后续动作由 X 助手驱动，中间区直接展示结果流。",
        icon: Rocket,
        accent: "D",
        prompts: [
          "总结当前部署状态和阻塞项",
          "生成一次部署检查清单",
          "分析失败部署并给出修复步骤",
        ],
        suggestions: [
          "部署状态",
          "阻塞项",
          "执行步骤",
        ],
      };
  }
}

function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : tone === "danger"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-[color:var(--color-surface-border)] bg-white text-[var(--color-text-subtle)]",
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          tone === "success"
            ? "bg-emerald-500"
            : tone === "danger"
              ? "bg-rose-500"
              : "bg-[var(--color-primary)]",
        )}
      />
      {label}
    </div>
  );
}

function toPlainText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_>#-]/g, " ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAnalysisLines(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.replace(/^(\d+\.|[-*•])\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 6);
}

function formatMessageTime(value?: number): string {
  if (!value) {
    return "now";
  }

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return "now";
  }
}

function SectionShell({
  title,
  eyebrow,
  children,
  className,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-[color:var(--color-surface-border)] bg-white/92 p-5 shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      <div className="mb-4">
        <p className="text-eyebrow font-semibold uppercase tracking-[0.24em] text-[var(--color-text-subtle)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--color-heading)]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function ObservabilityWorkspace({
  assistantState,
}: {
  assistantState: OpenClawAssistantViewState;
}) {
  const latestAssistantMessage = [...assistantState.messages]
    .reverse()
    .find((message) => message.role === "assistant");
  const latestUserMessage = [...assistantState.messages]
    .reverse()
    .find((message) => message.role === "user");
  const analysisSource =
    assistantState.streamingText || latestAssistantMessage?.text || "";
  const analysisLines = buildAnalysisLines(analysisSource);
  const timeline = assistantState.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-10);
  const plainAnalysis = toPlainText(analysisSource);
  const monitorCards = [
    {
      label: "Gateway",
      value: assistantState.healthBadge,
      caption: assistantState.connectionState === "ready" ? "connected" : "waiting",
    },
    {
      label: "Session",
      value: assistantState.selectedSessionLabel,
      caption: "current workspace",
    },
    {
      label: "Events",
      value: `${timeline.length}`,
      caption: "mirrored updates",
    },
    {
      label: "Focus",
      value: latestUserMessage ? toPlainText(latestUserMessage.text).slice(0, 44) : "awaiting input",
      caption: "latest operator intent",
    },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <SectionShell title="监控" eyebrow="Monitor">
          <div className="grid gap-3 sm:grid-cols-2">
            {monitorCards.map((card) => (
              <div
                key={card.label}
                className="rounded-[18px] border border-[color:var(--color-surface-border)] bg-[linear-gradient(180deg,rgba(240,244,255,0.56),rgba(255,255,255,0.9))] p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-text-subtle)]">
                  {card.label}
                </p>
                <p className="mt-3 text-base font-semibold text-[var(--color-heading)]">
                  {card.value}
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                  {card.caption}
                </p>
              </div>
            ))}
          </div>
        </SectionShell>

        <SectionShell
          title="分析"
          eyebrow="Analysis"
          className="bg-[linear-gradient(180deg,rgba(247,250,255,0.96),rgba(255,255,255,0.92))]"
        >
          {assistantState.errorMessage ? (
            <div className="mb-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {assistantState.errorMessage}
            </div>
          ) : null}

          {analysisLines.length > 0 ? (
            <div className="space-y-3">
              {analysisLines.map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  className="flex gap-3 rounded-[18px] border border-[color:var(--color-surface-border)] bg-white px-4 py-3"
                >
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-muted)] text-xs font-semibold text-[var(--color-primary)]">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-[var(--color-text)]">
                    {line}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[color:var(--color-surface-border)] bg-white/70 px-4 py-6 text-sm leading-7 text-[var(--color-text-subtle)]">
              右侧 X 助手开始输出后，这里会自动沉淀分析要点、异常归因和下一步动作。
            </div>
          )}

          {plainAnalysis ? (
            <div className="mt-4 rounded-[18px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/60 px-4 py-3 text-sm leading-7 text-[var(--color-text-subtle)]">
              {plainAnalysis.slice(0, 260)}
              {plainAnalysis.length > 260 ? "..." : ""}
            </div>
          ) : null}
        </SectionShell>
      </div>

      <SectionShell title="日志" eyebrow="Logs">
        {timeline.length > 0 ? (
          <div className="space-y-3">
            {timeline.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className="grid gap-3 rounded-[18px] border border-[color:var(--color-surface-border)] bg-white px-4 py-3 lg:grid-cols-[112px_minmax(0,1fr)]"
                >
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        isUser
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-heading)]",
                      )}
                    >
                      {isUser ? "Operator" : "X Assistant"}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
                      {formatMessageTime(message.timestampMs)}
                    </p>
                  </div>
                  <div
                    className="prose prose-sm max-w-none break-words whitespace-pre-wrap text-[var(--color-text)]"
                    dangerouslySetInnerHTML={{ __html: message.html }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 px-4 py-6 text-sm leading-7 text-[var(--color-text-subtle)]">
            这里会显示对话时间线、日志摘录和助手返回的关键事件。
          </div>
        )}
      </SectionShell>
    </div>
  );
}

export default function PlaceholderPage() {
  const pathname = usePathname();
  const kind = useMemo(() => getWorkspaceKind(pathname), [pathname]);
  const config = useMemo(() => getWorkspaceConfig(kind), [kind]);
  const Icon = config.icon;

  const [defaults, setDefaults] = useState<IntegrationDefaults>(EMPTY_DEFAULTS);
  const [promptSeed, setPromptSeed] = useState("");
  const [promptKey, setPromptKey] = useState(0);
  const [assistantState, setAssistantState] =
    useState<OpenClawAssistantViewState>({
      connectionState: "idle",
      healthBadge: "offline",
      errorMessage: "",
      hasGateway: false,
      selectedSessionLabel: "main",
      streamingText: "",
      streamingHtml: "",
      messages: [],
    });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/integrations/defaults", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as IntegrationDefaults;
        if (!cancelled) {
          setDefaults(payload);
        }
      } catch {
        // Keep empty defaults so the assistant can still render setup guidance.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const assistantMessages = assistantState.messages.filter(
    (message) => message.role === "user" || message.role === "assistant",
  );
  const statusTone =
    assistantState.connectionState === "ready"
      ? "success"
      : assistantState.connectionState === "error"
        ? "danger"
        : "neutral";

  return (
    <div className="flex h-full min-h-[calc(100vh-11rem)] flex-col gap-5">
      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-h-0 flex-col rounded-[26px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-md)]">
          <div className="border-b border-[color:var(--color-surface-border)] px-6 py-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-5xl font-bold tracking-[-0.04em] text-[var(--color-primary)]">
                  {config.accent}
                </div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--color-heading)]">
                  {config.title}
                </h1>
                <p className="mt-3 max-w-3xl text-lg leading-8 text-[var(--color-text-subtle)]">
                  {config.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusPill label={assistantState.healthBadge} tone={statusTone} />
                <StatusPill label={`Session · ${assistantState.selectedSessionLabel}`} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {config.prompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setPromptSeed(prompt);
                    setPromptKey((current) => current + 1);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-surface-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition hover:border-[color:var(--color-primary-border)] hover:text-[var(--color-primary)]"
                >
                  <Sparkles className="h-4 w-4" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {!assistantState.hasGateway ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 px-6 text-center">
                <ShieldCheck className="mb-4 h-10 w-10 text-[var(--color-primary)]" />
                <h2 className="text-2xl font-semibold text-[var(--color-heading)]">
                  先连接 X 助手
                </h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-[var(--color-text-subtle)]">
                  右侧助手已经默认打开。完成 Gateway 接入后，这里的中间结果区会直接显示部署、资源或日志分析结果。
                </p>
                <Link
                  href="/panel/api"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)]"
                >
                  打开接口集成
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : kind === "logs" ? (
              <ObservabilityWorkspace assistantState={assistantState} />
            ) : assistantMessages.length === 0 && !assistantState.streamingText ? (
              <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 px-6 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-semibold text-[var(--color-heading)]">
                  等待 X 助手输出结果
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--color-text-subtle)]">
                  在右侧直接提问，或者使用上面的快捷任务。助手的分析、步骤和流式结果会实时出现在这个中间工作区。
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {config.suggestions.map((item) => (
                    <div
                      key={item}
                      className="rounded-full border border-[color:var(--color-surface-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-subtle)]"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {assistantMessages.map((message) => {
                  const isUser = message.role === "user";

                  return (
                    <div
                      key={message.id}
                      className={cn("flex", isUser ? "justify-end" : "justify-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[88%] rounded-[22px] px-5 py-4 shadow-[var(--shadow-sm)]",
                          isUser
                            ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                            : "border border-[color:var(--color-surface-border)] bg-white text-[var(--color-text)]",
                        )}
                      >
                        <div
                          className={cn(
                            "prose prose-sm max-w-none break-words whitespace-pre-wrap",
                            isUser ? "prose-invert" : "",
                          )}
                          dangerouslySetInnerHTML={{ __html: message.html }}
                        />
                      </div>
                    </div>
                  );
                })}

                {assistantState.streamingText ? (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-[22px] border border-[color:var(--color-surface-border)] bg-white px-5 py-4 shadow-[var(--shadow-sm)]">
                      <div
                        className="prose prose-sm max-w-none break-words whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{
                          __html: assistantState.streamingHtml,
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <aside className="min-h-0 rounded-[26px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-md)]">
          <OpenClawAssistantPane
            defaults={defaults}
            initialQuestion={promptSeed}
            initialQuestionKey={promptKey}
            variant="sidebar"
            showConversation={false}
            emptyConversationHint="在这里发起部署、资源或日志任务，中间区域会同步展示结果。"
            onStateChange={setAssistantState}
          />
        </aside>
      </div>
    </div>
  );
}
