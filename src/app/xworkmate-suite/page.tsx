import type { Metadata } from "next";

import Footer from "@/components/Footer";
import UnifiedNavigation from "@/components/UnifiedNavigation";
import XWorkmateSuiteMarketing from "@/components/marketing/XWorkmateSuiteMarketing";

export const metadata: Metadata = {
  title: "XWorkmate 产品矩阵 | Cloud-Neutral Console",
  description:
    "面向个人 AI 工作流的 XWorkmate App、Bridge、OpenClaw multi-session plugins 与 workspace core skills 产品矩阵。",
};

export default function XWorkmateSuitePage() {
  return (
    <div className="min-h-screen bg-background text-text">
      <UnifiedNavigation />
      <XWorkmateSuiteMarketing />
      <Footer />
    </div>
  );
}
