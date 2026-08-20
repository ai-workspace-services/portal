// Marketing copy changes with a content push, not with a request. Prerender it
// and refresh in the background.
export const revalidate = 900;

import { getProduct } from "@/lib/docsServiceClient";
import ProductPageTemplate from "@/components/products/ProductPageTemplate";
import openPlatformData from "@/data/content/open-platform.json";

export default async function OpenPlatformPage() {
  let product = await getProduct("open-platform");
  if (!product) {
    const raw = (openPlatformData as any).zh || (openPlatformData as any).en || openPlatformData;
    product = {
      slug: "open-platform",
      language: "zh",
      hero: raw.hero,
      wizard: raw.wizard,
      showcases: raw.showcases || [],
    };
  }

  return <ProductPageTemplate product={product} language={product.language || "zh"} />;
}
