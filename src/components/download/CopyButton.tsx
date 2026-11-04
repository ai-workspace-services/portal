"use client";

import { Copy } from "lucide-react";

interface Props {
  text: string;
  label: string;
}

export default function CopyButton({ text, label }: Props) {
  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error("copy failed", e);
    }
  };
  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-900/10 bg-white text-slate-600 transition hover:border-slate-900/15 hover:bg-[#fcfbf8] dark:hover:bg-surface"
      title={label}
      aria-label={label}
    >
      <Copy className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
