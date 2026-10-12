import type { Metadata } from "next";

import ProductOverview from "@/components/products/ProductOverview";
import { publicDiscovery } from "@/data/content/public-discovery";

export const metadata: Metadata = {
  title: "Products | XWork Technologies",
  description: publicDiscovery.overview.description.en,
  alternates: {
    canonical: "https://xworktech.com/products",
  },
};

export default function ProductsPage() {
  return <ProductOverview />;
}
