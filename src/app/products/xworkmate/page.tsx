import type { Metadata } from "next";
import content from "@/data/content/xworkmate.json";
import XWorkmateProductView from "@/components/products/XWorkmateProductView";
import type { XWorkmateContent } from "@/lib/xworkmateContent";

export const revalidate = 900;

const copy = content as unknown as XWorkmateContent;
const url = "https://xworktech.com/products/xworkmate";

export const metadata: Metadata = {
  title: copy.zh.sharing.title,
  description: copy.zh.sharing.description,
  alternates: { canonical: url },
  openGraph: {
    type: "website",
    url,
    title: copy.zh.sharing.title,
    description: copy.zh.sharing.description,
    images: [
      {
        url: `https://xworktech.com${copy.zh.sharing.image}`,
        alt: copy.zh.hero.imageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: copy.zh.sharing.title,
    description: copy.zh.sharing.description,
    images: [`https://xworktech.com${copy.zh.sharing.image}`],
  },
};

export default function XworkmatePage() {
  return <XWorkmateProductView content={copy} />;
}
