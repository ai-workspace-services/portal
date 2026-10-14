import type { Metadata } from "next";
import content from "@/data/content/xconnect.json";
import XConnectProductView from "@/components/products/XConnectProductView";
import type { XConnectContent } from "@/lib/xconnectContent";

const copy = content as XConnectContent;
const url = "https://xworktech.com/products/xconnect";

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

export default function XConnectPage() {
  return <XConnectProductView content={copy} />;
}
