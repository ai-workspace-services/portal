import type { Metadata } from "next";
import EmailPreferencesForm from "@/components/email/EmailPreferencesForm";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  return (
    <EmailPreferencesForm
      token={typeof key === "string" ? key : undefined}
      unsubscribe={true}
    />
  );
}
