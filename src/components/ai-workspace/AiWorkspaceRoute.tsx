"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { AiWorkspacePage } from "@/components/ai-workspace/AiWorkspacePage";

export function AiWorkspaceRoute(): ReactNode {
  const searchParams = useSearchParams();

  return (
    <AiWorkspacePage
      initialPrompt={searchParams.get("prompt") ?? ""}
      initialSessionKey={searchParams.get("sessionKey") ?? ""}
    />
  );
}
