"use client";

/**
 * 产品页模板 —— Micro SaaS 模版
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版
 *
 * 结构与数据契约保持 #219 引入的形态（服务端 getProduct 取 CMS 内容），
 * 只把主体包进 .xds 作用域换视觉。MarketingNav / Footer 沿用站点级组件。
 */

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
    <div style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <MarketingNav />
      <main className="xds" style={{ paddingTop: 24 }}>
        <ProductHero hero={product.hero} language={language} />
        {product.wizard ? (
          <ProductWizard wizard={product.wizard} language={language} />
        ) : null}
        <ProductShowcases showcases={product.showcases} />
        <ProductCtaBanner hero={product.hero} language={language} />
      </main>
      <div className="mx-auto w-full max-w-6xl px-6 pb-10 lg:px-8">
        <Footer />
      </div>
    </div>
  );
}
