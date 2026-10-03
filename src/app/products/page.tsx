import type { Metadata } from "next";

import ProductOverview from "@/components/products/ProductOverview";

export const metadata: Metadata = {
  title: "Products | XWork Technologies",
  description:
    "Explore XWork Technologies products: XWorkmate, XConnect, AI Workspace, and Open Platform.",
  alternates: {
    canonical: "https://xworktech.com/products",
  },
};

export default function ProductsPage() {
  return <ProductOverview />;
}
