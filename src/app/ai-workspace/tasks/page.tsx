import { Suspense } from "react";
import { TaskCoordinationHub } from "@/components/ai-workspace/TaskCoordinationHub";

export const dynamic = "force-dynamic";

export default function TasksPage() {
  return (
    <div className="h-[calc(100vh-var(--app-shell-nav-offset))] w-full">
      <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">加载任务中枢...</div>}>
        <TaskCoordinationHub />
      </Suspense>
    </div>
  );
}

