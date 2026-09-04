"use client";

import { Bot, Check, Copy, FileText, Printer } from "lucide-react";
import { Github } from "@/components/icons/brand";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DocActionsProps = {
  isChinese: boolean;
  collection: string;
  slug: string;
  title: string;
  markdown?: string;
  editUrl?: string;
};

const actionClassName =
  "tactile-button tactile-button-subtle w-full justify-start text-left text-sm text-text-muted";

export default function DocActions({
  isChinese,
  collection,
  slug,
  title,
  markdown,
  editUrl,
}: DocActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const markdownPath = [collection, ...slug.split("/")]
    .map(encodeURIComponent)
    .join("/");

  async function copyMarkdown(): Promise<void> {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  function askAI(): void {
    const pageUrl = window.location.href;
    const prompt = isChinese
      ? `阅读并解释文档《${title}》。请先总结关键概念，再列出可执行步骤，并指出风险或前置条件。文档地址：${pageUrl}`
      : `Read and explain “${title}”. Summarize the key concepts, list actionable steps, and identify risks or prerequisites. Documentation URL: ${pageUrl}`;
    router.push(`/xworkmate?prompt=${encodeURIComponent(prompt)}`);
  }

  const copyLabel = copied
    ? isChinese
      ? "已复制 Markdown"
      : "Markdown copied"
    : isChinese
      ? "复制 Markdown"
      : "Copy Markdown";

  return (
    <div className="space-y-2">
      <p className="text-eyebrow font-semibold uppercase tracking-[0.24em] text-text-subtle">
        {isChinese ? "操作" : "Actions"}
      </p>
      <div className="grid gap-1">
        {markdown ? (
          <>
            <button
              type="button"
              onClick={copyMarkdown}
              className={actionClassName}
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Copy className="h-4 w-4" aria-hidden />
              )}
              {copyLabel}
            </button>
            <Link
              href={`/api/docs/markdown/${markdownPath}`}
              target="_blank"
              className={actionClassName}
            >
              <FileText className="h-4 w-4" aria-hidden />
              {isChinese ? "查看 Markdown" : "View Markdown"}
            </Link>
          </>
        ) : null}
        <button type="button" onClick={askAI} className={actionClassName}>
          <Bot className="h-4 w-4" aria-hidden />
          {isChinese ? "交给 AI 阅读" : "Read with AI"}
        </button>
        {editUrl ? (
          <a
            href={editUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={actionClassName}
          >
            <Github className="h-4 w-4" aria-hidden />
            {isChinese ? "在 GitHub 编辑" : "Edit on GitHub"}
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => window.print()}
          className={actionClassName}
        >
          <Printer className="h-4 w-4" aria-hidden />
          {isChinese ? "打印本文" : "Print this page"}
        </button>
      </div>
    </div>
  );
}
