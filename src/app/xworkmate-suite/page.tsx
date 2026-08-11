import type { Metadata } from "next";

import Footer from "@/components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import XWorkmateSuiteMarketing from "@/components/marketing/XWorkmateSuiteMarketing";

export const metadata: Metadata = {
  title: "XWorkmate 产品矩阵 | XWork Tech Console",
  description:
    "面向个人 AI 工作流的 XWorkmate App、Bridge、OpenClaw multi-session plugins 与 workspace core skills 产品矩阵。",
};

export default function XWorkmateSuitePage() {
  return (
    <div className="min-h-screen bg-background text-text">
      <MarketingNav />
      <XWorkmateSuiteMarketing />
      <Footer />
    </div>
  );
}
