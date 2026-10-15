"use client";

import { PaneToggleIcon } from "@/components/ai-workspace/shell/PaneToggleIcon";
import { useOptionalWorkspaceShell } from "@/components/ai-workspace/shell/WorkspaceShellContext";
import { cn } from "@/lib/utils";

/**
 * Brings the sidebar back from a page's own top toolbar, so no floating button
 * sits over the page. On desktop it shows only while the sidebar is hidden;
 * on mobile, where the sidebar is a drawer, it is always the way to open it.
 */
export function SidebarRevealButton({ className }: { className?: string }) {
  const shell = useOptionalWorkspaceShell();
  if (!shell) return null;
  const buttonClass =
    "grid size-8 shrink-0 place-items-center rounded-lg text-[#697386] transition hover:bg-[#edf1f6] hover:text-[#17181c]";
  return (
    <>
      <button
        type="button"
        data-testid="sidebar-reveal-mobile"
        className={cn(buttonClass, "md:hidden", className)}
        onClick={() => shell.setMobileSidebarOpen(true)}
        aria-label="打开任务导航"
      >
        <PaneToggleIcon side="left" />
      </button>
      {shell.sidebarHidden ? (
        <button
          type="button"
          data-testid="sidebar-reveal"
          className={cn(buttonClass, "hidden md:grid", className)}
          onClick={() => shell.setSidebarHidden(false)}
          aria-label="展开边栏"
        >
          <PaneToggleIcon side="left" />
        </button>
      ) : null}
    </>
  );
}
