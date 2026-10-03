"use client";

export const dynamic = "error";

import Footer from "@/components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import HeroSection from "@/components/marketing/HeroSection";
import CoreCapabilitiesSection from "@/components/marketing/CoreCapabilitiesSection";
import EditionsCarouselSection from "@/components/marketing/EditionsCarouselSection";
import WorkflowSection from "@/components/marketing/WorkflowSection";
import ControlPlaneSection from "@/components/marketing/ControlPlaneSection";
import ProofSection from "@/components/marketing/ProofSection";
import PricingTeaser from "@/components/marketing/PricingTeaser";
import FinalCta from "@/components/marketing/FinalCta";
import BuiltByBadge from "@/components/marketing/BuiltByBadge";

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <MarketingNav />
      <main>
        {/* Section order follows store-and-startup-homepage-spec: the product
            matrix sits right under the hero so a reviewer reaches every
            /products/* page within one scroll. */}
        <HeroSection />
        <ProofSection />
        <EditionsCarouselSection />
        <CoreCapabilitiesSection />
        <WorkflowSection />
        <ControlPlaneSection />
        <PricingTeaser />
        <FinalCta />
        <BuiltByBadge />
      </main>
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-8">
        <Footer />
      </div>
    </div>
  );
}
