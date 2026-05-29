export const dynamic = "force-dynamic";

import { Suspense } from "react";

import { XWorkmateLoading } from "@/app/xworkmate/XWorkmateLoading";
import { XWorkmateWorkspaceRoute } from "@/components/xworkmate/XWorkmateWorkspaceRoute";

export const metadata = {
  title: "XWorkmate",
  description: "Online XWorkmate workspace powered by xworkmate-bridge",
};

export default function XWorkmatePage() {
  return (
    <div className="h-[calc(100vh-var(--app-shell-nav-offset))] w-full">
      <Suspense fallback={<XWorkmateLoading />}>
        <XWorkmateWorkspaceRoute />
      </Suspense>
    </div>
  );
}
