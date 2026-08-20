// Marketing copy changes with a content push, not with a request. Prerender it
// and refresh in the background.
export const revalidate = 900;

import { getProduct } from "@/lib/docsServiceClient";
import ProductPageTemplate from "@/components/products/ProductPageTemplate";
import xworkmateData from "@/data/content/xworkmate.json";

export default async function XworkmatePage() {
  let product = await getProduct("xworkmate");
  if (!product) {
    const raw = (xworkmateData as any).zh || (xworkmateData as any).en || xworkmateData;
    product = {
      slug: "xworkmate",
      language: "zh",
      hero: raw.hero,
      wizard: raw.wizard,
      showcases: raw.showcases || [],
    };
  }

  return <ProductPageTemplate product={product} language={product.language || "zh"} />;
}
