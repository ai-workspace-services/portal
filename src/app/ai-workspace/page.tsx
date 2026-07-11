export const dynamic = "force-dynamic";

import { Suspense } from "react";

import { XWorkmateLoading } from "@/app/xworkmate/XWorkmateLoading";
import { AiWorkspaceRoute } from "@/components/ai-workspace/AiWorkspaceRoute";

export const metadata = {
  title: "AI Workspace",
  description: "Online AI Workspace powered by xworkmate-bridge",
};

export default function AiWorkspacePage() {
  return (
    <div className="h-[calc(100vh-var(--app-shell-nav-offset))] w-full">
      <Suspense fallback={<XWorkmateLoading />}>
        <AiWorkspaceRoute />
      </Suspense>
    </div>
  );
}
