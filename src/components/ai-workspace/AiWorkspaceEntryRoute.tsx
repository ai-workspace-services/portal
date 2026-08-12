"use client";

import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { AiWorkspaceOverview } from "@/components/ai-workspace/AiWorkspaceOverview";
import { XWorkmateWorkspaceRoute } from "@/components/xworkmate/XWorkmateWorkspaceRoute";

/**
 * Keep the analytics workbench as the default entry, while routing the
 * marketing free-trial CTA into the anonymous task-running workspace.
 */
export function AiWorkspaceEntryRoute(): ReactNode {
  const searchParams = useSearchParams();

  if (searchParams.get("entry") === "trial") {
    return <XWorkmateWorkspaceRoute trialMode />;
  }

  return <AiWorkspaceOverview />;
}
