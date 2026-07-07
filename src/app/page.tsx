"use client";

export const dynamic = "error";

import Footer from "@/components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import HeroSection from "@/components/marketing/HeroSection";
import FeatureGrid from "@/components/marketing/FeatureGrid";
import ProductGrid from "@/components/marketing/ProductGrid";
import StatsBar from "@/components/marketing/StatsBar";
import BenefitList from "@/components/marketing/BenefitList";
import InviteBanner from "@/components/marketing/InviteBanner";
import PricingTeaser from "@/components/marketing/PricingTeaser";
import FinalCta from "@/components/marketing/FinalCta";

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <MarketingNav />
      <main>
        <HeroSection />
        <FeatureGrid />
        <ProductGrid />
        <StatsBar />
        <BenefitList />
        <InviteBanner />
        <PricingTeaser />
        <FinalCta />
      </main>
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-8">
        <Footer />
      </div>
    </div>
  );
}
