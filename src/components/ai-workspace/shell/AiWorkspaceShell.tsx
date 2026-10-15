"use client";

import { Bot, LayoutGrid, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import Sidebar, { BOT_TEAM_HREF, WORKBENCH_HREF } from "@/components/ai-workspace/Sidebar";
import { useWorkspaceShell } from "@/components/ai-workspace/shell/WorkspaceShellContext";
import { cn } from "@/lib/utils";

/**
 * The frame of the AI Workspace: the one sidebar, the page in a rounded card,
 * and on mobile a drawer plus a bottom bar. Pages render only their own panes
 * and put the sidebar toggle in their top toolbar (SidebarRevealButton).
 */
export function AiWorkspaceShell({ children }: { children: ReactNode }) {
  const shell = useWorkspaceShell();
  const pathname = usePathname();

  return (
    <div className="relative flex h-full overflow-hidden bg-[#f4f5f7] text-sm text-slate-900">
      {!shell.sidebarHidden ? (
        <div className="hidden h-full md:block">
          <Sidebar onHide={() => shell.setSidebarHidden(true)} />
        </div>
      ) : null}
      <main className="min-w-0 flex-1 overflow-hidden p-0 pb-[68px] md:p-2 md:pb-2">
        <div className="flex h-full min-h-0 overflow-hidden bg-white md:rounded-[14px] md:border md:border-[#e4e8ef] md:shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
          {children}
        </div>
      </main>
      {shell.mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <Sidebar mobile onHide={() => shell.setMobileSidebarOpen(false)} />
          <button
            type="button"
            aria-label="关闭任务导航"
            className="flex-1 bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => shell.setMobileSidebarOpen(false)}
          />
        </div>
      ) : null}
      <nav
        aria-label="移动端主导航"
        className="fixed inset-x-3 bottom-2 z-40 flex h-[58px] items-center justify-around rounded-2xl border border-slate-200 bg-white/95 px-2 shadow-lg backdrop-blur md:hidden"
      >
        <MobileTab
          href={shell.homeHref}
          icon={MessageSquarePlus}
          label="对话"
          selected={pathname === shell.homeHref || pathname.startsWith("/ai-workspace/conversation")}
        />
        <MobileTab
          href={WORKBENCH_HREF}
          icon={LayoutGrid}
          label="工作台"
          selected={pathname.startsWith(WORKBENCH_HREF)}
        />
        <MobileTab
          href={BOT_TEAM_HREF}
          icon={Bot}
          label="Bot 团队"
          selected={pathname.startsWith(BOT_TEAM_HREF)}
        />
      </nav>
    </div>
  );
}

function MobileTab({
  href,
  icon: Icon,
  label,
  selected,
}: {
  href: string;
  icon: typeof Bot;
  label: string;
  selected: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl px-4 py-1 text-eyebrow font-medium",
        selected ? "bg-blue-50 text-[#075ecc]" : "text-slate-600",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
