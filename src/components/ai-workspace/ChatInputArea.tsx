"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  appendTaskMessage,
  createTaskSession,
  listTaskNamespaces,
  type SubmitTaskMessageResult,
} from "@/lib/ai-workspace/sessionApi";
import * as Popover from "@radix-ui/react-popover";
import { BUILTIN_PLUGIN_GROUPS as TOOLS } from "@/components/ai-workspace/builtinPlugins";

type ChatInputAreaProps = {
  sessionId?: string;
  onSubmitted?: (result: SubmitTaskMessageResult) => void;
};

export default function ChatInputArea({
  sessionId,
  onSubmitted,
}: ChatInputAreaProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("快速");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const prompt = text.trim();
    if (!prompt || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      let targetSessionId = sessionId;
      if (!targetSessionId) {
        const namespaces = await listTaskNamespaces();
        const namespaceId = namespaces[0]?.namespaceId;
        if (!namespaceId) throw new Error("当前账号尚未分配会话命名空间");
        const session = await createTaskSession(namespaceId, {
          title: prompt.slice(0, 80),
        });
        targetSessionId = session.sessionId;
      }
      const result = await appendTaskMessage(targetSessionId, {
        clientRequestId:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `web-${Date.now()}`,
        text: prompt,
        run: { priority: 0 },
      });
      setText("");
      onSubmitted?.(result);
      if (!sessionId)
        router.replace(
          `/ai-workspace/conversation/${encodeURIComponent(targetSessionId)}`,
        );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "消息发送失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-[24px] shadow-sm p-3 sm:p-4 mx-auto w-full relative flex flex-col transition-all hover:border-gray-300">
      {/* Text Area */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="尽管问，或做个 Agent 任务..."
        disabled={submitting}
        className="w-full min-h-[72px] sm:min-h-[90px] resize-none outline-none border-none text-sm sm:text-base text-gray-900 placeholder:text-gray-400 p-2 bg-transparent leading-relaxed disabled:opacity-60"
      />

      {error ? (
        <p role="alert" className="px-2 pb-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2">
        {/* Left Plus Popover */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors">
              <Plus className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
              sideOffset={8}
              align="start"
            >
              <div className="max-h-[400px] overflow-y-auto pr-1 py-1 space-y-4">
                {TOOLS.map((group, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-semibold text-gray-400 mb-2 px-3">
                      {group.category}
                    </div>
                    <div className="space-y-1">
                      {group.items.map((tool, i) => (
                        <button
                          key={i}
                          className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-50 rounded-xl text-left transition-colors"
                        >
                          <div
                            className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
                              tool.color,
                              tool.textColor,
                            )}
                          >
                            <tool.icon
                              className="w-4.5 h-4.5"
                              strokeWidth={2}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              {tool.name}
                              <span className="text-xs font-normal text-gray-400 truncate">
                                {tool.desc}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Right Mode Dropdown & Submit Circle */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors font-medium">
            <span>{mode} 进阶</span>
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </button>

          <button
            onClick={() => void handleSubmit()}
            disabled={!text.trim() || submitting}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm",
              text.trim() && !submitting
                ? "bg-gray-900 text-white hover:bg-black"
                : "bg-gray-200 text-white cursor-not-allowed",
            )}
          >
            <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
