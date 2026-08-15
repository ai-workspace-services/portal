export const dynamic = "force-dynamic";

import { getProduct } from "@/lib/docsServiceClient";
import ProductPageTemplate from "@/components/products/ProductPageTemplate";
import xconnectData from "@/data/content/xconnect.json";

export default async function XConnectPage() {
  let product = await getProduct("xconnect");
  if (!product) {
    const raw = (xconnectData as any).zh || (xconnectData as any).en || xconnectData;
    product = {
      slug: "xconnect",
      language: "zh",
      hero: raw.hero,
      wizard: raw.wizard,
      showcases: raw.showcases || [],
    };
  }

  return <ProductPageTemplate product={product} language={product.language || "zh"} />;
}
