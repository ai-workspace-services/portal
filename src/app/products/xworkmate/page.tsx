// Marketing copy changes with a content push, not with a request. Prerender it
// and refresh in the background.
export const revalidate = 900;

import XWorkmateProductView from "@/components/products/XWorkmateProductView";

export const metadata = {
  title: "XWorkmate — AI Workspace",
  description:
    "Connect AI models, autonomous agents, engineering tools, and business data to deliver real-world work.",
  alternates: {
    canonical: "https://xworktech.com/products/xworkmate",
  },
};

export default function XworkmatePage() {
  return <XWorkmateProductView />;
}
