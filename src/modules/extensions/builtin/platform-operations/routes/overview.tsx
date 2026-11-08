"use client";

import { useState } from "react";
import { Activity, Layers } from "lucide-react";
import ProgressiveReleaseValidation from "../components/ProgressiveReleaseValidation";
import SnapshotOperationsPage from "../components/SnapshotOperationsPage";

export default function PlatformOperationsOverviewRoute() {
  const [activeTab, setActiveTab] = useState<"validation" | "snapshots">("validation");

  return (
    <div className="w-full space-y-4">
      {/* 顶部视图切换导航 Tab */}
      <div className="flex items-center justify-between border-b border-[color:var(--color-surface-border)] pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("validation")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "validation"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] border border-[color:var(--color-surface-border)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            <span>Progressive Release Validation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("snapshots")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === "snapshots"
                ? "bg-[var(--color-surface)] text-[var(--color-text)] border border-[color:var(--color-surface-border)] shadow-[var(--shadow-sm)]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            <span>Snapshot Operations & Plans</span>
          </button>
        </div>
      </div>

      {/* 视图内容区 */}
      {activeTab === "validation" ? (
        <ProgressiveReleaseValidation initialEnvironment="PROD" />
      ) : (
        <SnapshotOperationsPage />
      )}
    </div>
  );
}
