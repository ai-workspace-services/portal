import type { Metadata } from "next";
import content from "@/data/content/ai-workspace.json";
import AiWorkspaceProductView from "@/components/products/AiWorkspaceProductView";
import type { AiWorkspaceContent } from "@/lib/aiWorkspaceContent";

export const revalidate = 900;

const copy = content as unknown as AiWorkspaceContent;
const url = "https://xworktech.com/products/ai-workspace";

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

export default function AiWorkspacePage() {
  return <AiWorkspaceProductView content={copy} />;
}
