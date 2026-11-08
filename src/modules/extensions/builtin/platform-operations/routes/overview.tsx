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
      <div className="flex items-center justify-between border-b border-[#20273a] pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("validation")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "validation"
                ? "bg-[#1e2538] text-white border border-[#2e3a57] shadow-sm"
                : "text-[#94a3b8] hover:text-white hover:bg-[#141824]"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>Progressive Release Validation</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("snapshots")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === "snapshots"
                ? "bg-[#1e2538] text-white border border-[#2e3a57] shadow-sm"
                : "text-[#94a3b8] hover:text-white hover:bg-[#141824]"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#94a3b8]" />
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
