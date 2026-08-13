"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";

import Sidebar from "@/components/ai-workspace/Sidebar";

export default function AiWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const [sidebarHidden, setSidebarHidden] = useState(false);

  // The trial entry renders the standalone XWorkmate workspace, which owns
  // its own sidebar and full-screen shell. Do not wrap it in the analytics
  // workbench shell as that would render two nested workspaces.
  if (searchParams.get("entry") === "trial") {
    return <>{children}</>;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-[#f7f7f8] text-sm text-slate-900">
      {!sidebarHidden ? <Sidebar onHide={() => setSidebarHidden(true)} /> : null}
      <main className="min-w-0 flex-1 overflow-hidden p-2 sm:p-3">
        <div className="flex h-full min-h-0 overflow-hidden rounded-[18px] border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          {children}
        </div>
      </main>
      {sidebarHidden ? (
        <button
          type="button"
          className="absolute left-3 top-3 z-20 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:text-slate-900"
          onClick={() => setSidebarHidden(false)}
          aria-label="展开边栏"
        >
          →
        </button>
      ) : null}
    </div>
  );
}
