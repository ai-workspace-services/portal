"use client";

import Footer from "@/components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import ProductHero from "./ProductHero";
import ProductWizard from "./ProductWizard";
import ProductShowcases from "./ProductShowcases";
import ProductCtaBanner from "./ProductCtaBanner";
import type { WebsiteProductPayload } from "@/lib/docsServiceClient";

interface ProductPageTemplateProps {
  product: WebsiteProductPayload;
  language?: string;
}

export default function ProductPageTemplate({
  product,
  language = "zh",
}: ProductPageTemplateProps) {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <MarketingNav />
      <main className="pt-24 pb-16 sm:pt-32">
        <ProductHero hero={product.hero} language={language} />
        {product.wizard && (
          <ProductWizard wizard={product.wizard} language={language} />
        )}
        <ProductShowcases showcases={product.showcases} />
        <ProductCtaBanner hero={product.hero} language={language} />
      </main>
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-8">
        <Footer />
      </div>
    </div>
  );
}
