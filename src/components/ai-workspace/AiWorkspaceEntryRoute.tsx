"use client";

import type { ReactNode } from "react";

import { XWorkmateWorkspaceRoute } from "@/components/xworkmate/XWorkmateWorkspaceRoute";

/**
 * The public workspace entry is the anonymous Free experience by default.
 */
export function AiWorkspaceEntryRoute(): ReactNode {
  return <XWorkmateWorkspaceRoute trialMode />;
}
