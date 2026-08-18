import { Suspense } from "react";

import { XWorkmateLoading } from "@/app/xworkmate/XWorkmateLoading";
import { AiWorkspaceEntryRoute } from "@/components/ai-workspace/AiWorkspaceEntryRoute";

export const dynamic = "force-dynamic";

export default function AiWorkspacePage() {
  return (
    <div className="h-[calc(100vh-var(--app-shell-nav-offset))] w-full">
      <Suspense fallback={<XWorkmateLoading />}>
        <AiWorkspaceEntryRoute />
      </Suspense>
    </div>
  );
}
