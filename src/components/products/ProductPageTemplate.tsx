"use client";

/**
 * 产品页模板 —— Micro SaaS 模版
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版
 *
 * 结构与数据契约保持 #219 引入的形态（服务端 getProduct 取 CMS 内容）。
 * 导航与页脚改用 xds 版站点组件，整页（含 chrome）都在 .xds 作用域内，
 * 不再出现 Tailwind / marketingTheme 与 xds 混排。
 */

import XdsSiteFooter from "@/components/xds/XdsSiteFooter";
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
    <div className="xds" style={{ minHeight: "100vh", overflowX: "hidden" }}>
      <MarketingNav />
      <main style={{ paddingTop: 24 }}>
        <ProductHero hero={product.hero} language={language} />
        {product.wizard ? (
          <ProductWizard wizard={product.wizard} language={language} />
        ) : null}
        <ProductShowcases showcases={product.showcases} />
        <ProductCtaBanner hero={product.hero} language={language} />
      </main>
      <XdsSiteFooter />
    </div>
  );
}
