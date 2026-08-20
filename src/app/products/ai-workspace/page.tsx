// Marketing copy changes with a content push, not with a request. Prerender it
// and refresh in the background.
export const revalidate = 900;

import { getProduct } from "@/lib/docsServiceClient";
import ProductPageTemplate from "@/components/products/ProductPageTemplate";
import aiWorkspaceData from "@/data/content/ai-workspace.json";

export default async function AiWorkspacePage() {
  let product = await getProduct("ai-workspace");
  if (!product) {
    const raw = (aiWorkspaceData as any).zh || (aiWorkspaceData as any).en || aiWorkspaceData;
    product = {
      slug: "ai-workspace",
      language: "zh",
      hero: raw.hero,
      wizard: raw.wizard,
      showcases: raw.showcases || [],
    };
  }

  return <ProductPageTemplate product={product} language={product.language || "zh"} />;
}
