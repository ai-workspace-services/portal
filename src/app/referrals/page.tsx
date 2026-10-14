import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/lib/authGateway";
import content from "@/data/content/referral.json";
import ReferralCenter from "@/components/referrals/ReferralCenter";
import type { ReferralContent } from "@/lib/referral-content";
export const metadata: Metadata = {
  title: content.zh.center.title,
  robots: { index: false, follow: false },
};
export default async function ReferralsPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value?.trim();
  if (!token) redirect("/login?redirect=%2Freferrals");
  return <ReferralCenter content={content as ReferralContent} />;
}
