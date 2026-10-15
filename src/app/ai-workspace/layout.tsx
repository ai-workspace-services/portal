"use client";

import { Suspense } from "react";

import { AiWorkspaceShell } from "@/components/ai-workspace/shell/AiWorkspaceShell";
import { WorkspaceShellProvider } from "@/components/ai-workspace/shell/WorkspaceShellContext";

/**
 * Every /ai-workspace route shares one shell with one sidebar. Pages render
 * only their own panes inside it; none of them brings a second sidebar.
 */
export default function AiWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <WorkspaceShellProvider homeHref="/ai-workspace">
        <div className="h-[100dvh]">
          <AiWorkspaceShell>{children}</AiWorkspaceShell>
        </div>
      </WorkspaceShellProvider>
    </Suspense>
  );
}
