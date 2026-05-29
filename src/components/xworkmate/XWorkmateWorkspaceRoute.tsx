"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { XWorkmateWorkspacePage } from "@/components/xworkmate/XWorkmateWorkspacePage";

export function XWorkmateWorkspaceRoute(): ReactNode {
  const searchParams = useSearchParams();

  return (
    <XWorkmateWorkspacePage
      initialPrompt={searchParams.get("prompt") ?? ""}
      initialSessionKey={searchParams.get("sessionKey") ?? ""}
    />
  );
}
