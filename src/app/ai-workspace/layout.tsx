"use client";

import {
  History,
  LayoutDashboard,
  Menu,
  MessageSquarePlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import Sidebar from "@/components/ai-workspace/Sidebar";

export default function AiWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <AiWorkspaceLayoutContent>{children}</AiWorkspaceLayoutContent>
    </Suspense>
  );
}

function AiWorkspaceLayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // The trial entry renders the standalone XWorkmate workspace, which owns
  // its own sidebar and full-screen shell. Do not wrap it in the analytics
  // workbench shell as that would render two nested workspaces.
  if (searchParams.get("entry") === "trial") {
    return <>{children}</>;
  }

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-[#f7f7f8] text-sm text-slate-900">
      {!sidebarHidden ? (
        <div className="hidden h-full md:block">
          <Sidebar onHide={() => setSidebarHidden(true)} />
        </div>
      ) : null}
      <main className="min-w-0 flex-1 overflow-hidden p-0 pb-[68px] md:p-3 md:pb-3">
        <div className="flex h-full min-h-0 overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          {children}
        </div>
      </main>
      {sidebarHidden ? (
        <button
          type="button"
          className="absolute left-3 top-3 z-20 hidden rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-slate-900 md:block"
          onClick={() => setSidebarHidden(false)}
          aria-label="展开边栏"
        >
          →
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
        className="absolute left-3 top-3 z-30 grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm md:hidden"
        aria-label="打开任务导航"
      >
        <Menu className="size-5" />
      </button>
      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <Sidebar mobile onHide={() => setMobileSidebarOpen(false)} />
          <button
            type="button"
            aria-label="关闭任务导航"
            className="flex-1 bg-slate-950/30 backdrop-blur-[2px]"
            onClick={() => setMobileSidebarOpen(false)}
          />
        </div>
      ) : null}
      <nav
        aria-label="移动端主导航"
        className="fixed inset-x-3 bottom-2 z-40 flex h-[58px] items-center justify-around rounded-2xl border border-slate-200 bg-white/95 px-2 shadow-lg backdrop-blur md:hidden"
      >
        <Link
          href="/ai-workspace/conversation/new"
          className="flex flex-col items-center gap-0.5 px-4 py-1 text-[11px] font-semibold text-slate-600"
        >
          <MessageSquarePlus className="size-5" />
          助手
        </Link>
        <Link
          href="/ai-workspace"
          className="flex flex-col items-center gap-0.5 rounded-xl bg-blue-50 px-5 py-1 text-[11px] font-bold text-[#075ecc]"
        >
          <LayoutDashboard className="size-5" />
          任务
        </Link>
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 px-4 py-1 text-[11px] font-semibold text-slate-600"
        >
          <History className="size-5" />
          历史
        </button>
      </nav>
    </div>
  );
}
