"use client";

import {
  Bot,
  ChevronRight,
  Paperclip,
  RefreshCw,
  Send,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";

type XWorkmateAssistantShellProps = {
  mode: "full" | "sidebar" | "hero";
  isChinese: boolean;
  prompt: string;
  onPromptChange: (value: string) => void;
  connected: boolean;
  endpointLabel?: string;
  connectionHint?: string;
  actionDisabled?: boolean;
  canManageConnections?: boolean;
  onOpenConnections?: () => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onExpand?: (prompt?: string) => void;
  showConnectionStatus?: boolean;
};

function pickCopy<T>(isChinese: boolean, zh: T, en: T): T {
  return isChinese ? zh : en;
}

export function XWorkmateAssistantShell({
  mode,
  isChinese,
  prompt,
  onPromptChange,
  connected,
  endpointLabel,
  connectionHint,
  actionDisabled,
  canManageConnections,
  onOpenConnections,
  primaryActionLabel,
  secondaryActionLabel,
  onExpand,
  showConnectionStatus = true,
}: XWorkmateAssistantShellProps) {
  const router = useRouter();
  const suggestions = pickCopy(
    isChinese,
    [
      "幻灯片",
      "视频生成",
      "深度研究",
      "文档处理",
      "数据分析",
      "可视化",
      "金融服务",
      "产品管理",
      "设计",
      "邮件编辑",
    ],
    [
      "Slides",
      "Video Gen",
      "Deep Research",
      "Docs Processing",
      "Data Analysis",
      "Visualization",
      "Finance",
      "Product Management",
      "Design",
      "Email Edit",
    ],
  );

  const openWorkspace = (): void => {
    const nextPrompt = prompt.trim();
    if (onExpand) {
      onExpand(nextPrompt);
      return;
    }
    const query = nextPrompt ? `?prompt=${encodeURIComponent(nextPrompt)}` : "";
    router.push(`/xworkmate${query}`);
  };

  const title =
    mode === "hero"
      ? pickCopy(isChinese, "X助手", "X Assistant")
      : pickCopy(isChinese, "XWorkmate 助手", "XWorkmate Assistant");

  const description =
    mode === "hero"
      ? pickCopy(
          isChinese,
          "先在这里写一句话，再进入完整工作台继续协作。",
          "Start here, then continue in the full workspace.",
        )
      : pickCopy(
          isChinese,
          "这是 `/xworkmate` assistant 首页的小化版入口。",
          "This is the minimized entry of the `/xworkmate` assistant home.",
        );

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col",
        mode === "full" ? "p-4" : "p-0",
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        {showConnectionStatus ? (
          <div
            className={cn(
              "rounded-[16px] border border-[color:var(--color-surface-border)] bg-white/96 p-5 shadow-[var(--shadow-soft)]",
              mode === "full" ? "mb-6" : "mb-4",
            )}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      connected ? "bg-emerald-500" : "bg-amber-400",
                    )}
                  />
                  <h2 className="text-lg font-semibold text-black">{title}</h2>
                </div>
                <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
                  {connectionHint ||
                    (connected
                      ? pickCopy(
                          isChinese,
                          `当前目标：${endpointLabel || "已连接"}`,
                          `Connected to ${endpointLabel || "workspace target"}`,
                        )
                      : description)}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {canManageConnections && onOpenConnections ? (
                  <button
                    type="button"
                    onClick={onOpenConnections}
                    disabled={actionDisabled}
                    className="tactile-button tactile-button-soft px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {primaryActionLabel ||
                      pickCopy(isChinese, "打开配置页", "Open Config")}
                  </button>
                ) : null}
                {mode !== "full" ? (
                  <button
                    type="button"
                    onClick={openWorkspace}
                    className="tactile-button tactile-button-primary px-4 text-sm"
                  >
                    {secondaryActionLabel ||
                      pickCopy(isChinese, "打开完整工作台", "Open Workspace")}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "mx-auto mt-auto w-full shrink-0",
          mode === "full" ? "max-w-4xl pt-4" : "",
        )}
      >
        <div className="rounded-[16px] border border-[color:var(--color-surface-border)] bg-white shadow-[0_4px_24px_rgba(15,23,42,0.04)] transition-all focus-within:border-[color:var(--color-primary-border)] focus-within:ring-1 focus-within:ring-[color:var(--color-primary-border)]">
          <div className="flex items-center justify-between border-b border-transparent p-2">
            <button
              type="button"
              className="rounded-lg p-2 text-[var(--color-text-subtle)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-black"
            >
              <Paperclip className="h-[18px] w-[18px]" />
            </button>
            {mode === "sidebar" ? (
              <button
                type="button"
                onClick={openWorkspace}
                className="tactile-button tactile-button-subtle min-h-9 px-3 text-xs"
              >
                {pickCopy(isChinese, "最大化", "Maximize")}
              </button>
            ) : null}
          </div>

          <textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                openWorkspace();
              }
            }}
            placeholder={pickCopy(
              isChinese,
              "有什么想问的？",
              "What would you like to ask?",
            )}
            className={cn(
              "w-full resize-none bg-transparent px-4 py-2 text-body leading-relaxed text-[var(--color-heading)] outline-none placeholder:text-[var(--color-text-subtle)]",
              mode === "hero" ? "min-h-[120px]" : "min-h-[80px]",
            )}
          />

          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-2.5 text-xs font-medium text-[var(--color-text-subtle)] transition hover:bg-white hover:text-black"
              >
                <Bot className="h-3.5 w-3.5" />
                Agent
                <ChevronRight className="h-3 w-3 rotate-90" />
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-2.5 text-xs font-medium text-black transition hover:bg-[var(--color-surface-hover)]"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded bg-black text-eyebrow font-bold text-white">
                  Z
                </span>
                GLM-5.0
                <ChevronRight className="h-3 w-3 rotate-90" />
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[color:var(--color-surface-border)] bg-white text-[var(--color-text-subtle)] transition hover:border-[color:var(--color-text-subtle)] hover:text-black"
              >
                <Zap className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={openWorkspace}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition",
                prompt.trim()
                  ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-text-subtle)]",
              )}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 flex flex-wrap items-center justify-center gap-2 pb-2",
            mode === "hero" && "justify-start",
          )}
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onPromptChange(suggestion)}
              className="inline-flex h-8 items-center rounded-full border border-[color:var(--color-surface-border)] bg-white px-3.5 text-caption text-[var(--color-text-subtle)] transition hover:border-[color:var(--color-text-subtle)] hover:text-black"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
