import { notFound } from "next/navigation";
import { getProduct, type WebsiteProductPayload } from "@/lib/docsServiceClient";
import ProductPageTemplate from "@/components/products/ProductPageTemplate";

import xconnectData from "@/data/content/xconnect.json";
import xworkmateData from "@/data/content/xworkmate.json";
import openPlatformData from "@/data/content/open-platform.json";
import aiWorkspaceData from "@/data/content/ai-workspace.json";

const STATIC_FALLBACKS: Record<string, any> = {
  xconnect: xconnectData,
  xworkmate: xworkmateData,
  "open-platform": openPlatformData,
  "ai-workspace": aiWorkspaceData,
};

interface ProductSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDynamicPage({ params }: ProductSlugPageProps) {
  const { slug } = await params;

  // 1. Try to fetch dynamic content from content-service (Git backed)
  let product: WebsiteProductPayload | null = await getProduct(slug);

  // 2. Fallback to static snapshot if content-service is offline or product not indexed yet
  if (!product && STATIC_FALLBACKS[slug]) {
    const raw = STATIC_FALLBACKS[slug];
    const localized = raw.zh || raw.en || raw;
    product = {
      slug,
      language: "zh",
      hero: localized.hero,
      wizard: localized.wizard,
      showcases: localized.showcases || [],
    };
  }

  if (!product) {
    notFound();
  }

  return <ProductPageTemplate product={product} language={product.language || "zh"} />;
}
