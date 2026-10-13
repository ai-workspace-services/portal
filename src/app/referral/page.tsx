import type { Metadata } from "next";
import content from "@/data/content/referral.json";
import product from "@/data/content/xconnect.json";
import ReferralLanding from "@/components/referrals/ReferralLanding";
import type { ReferralContent } from "@/lib/referral-content";
import type { XConnectContent } from "@/lib/xconnectContent";
const copy = content as ReferralContent;
const url = "https://xworktech.com/referral";
export const metadata: Metadata = {
  title: copy.zh.seo.title,
  description: copy.zh.seo.description,
  alternates: { canonical: url },
  openGraph: {
    type: "website",
    url,
    title: copy.zh.seo.ogTitle,
    description: copy.zh.seo.ogDescription,
    images: [`https://xworktech.com${copy.zh.seo.ogImage}`],
  },
  twitter: {
    card: "summary_large_image",
    title: copy.zh.seo.ogTitle,
    description: copy.zh.seo.ogDescription,
    images: [`https://xworktech.com${copy.zh.seo.ogImage}`],
  },
};
export default function ReferralPage() {
  return (
    <ReferralLanding content={copy} product={product as XConnectContent} />
  );
}
