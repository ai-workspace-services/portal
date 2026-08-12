import { Suspense } from "react";

import { XWorkmateLoading } from "@/app/xworkmate/XWorkmateLoading";
import { AiWorkspaceOverview } from "@/components/ai-workspace/AiWorkspaceOverview";

export const dynamic = "force-dynamic";

export default function AiWorkspacePage() {
  return (
    <div className="h-[calc(100vh-var(--app-shell-nav-offset))] w-full">
      <Suspense fallback={<XWorkmateLoading />}>
        <AiWorkspaceOverview />
      </Suspense>
    </div>
  );
}
