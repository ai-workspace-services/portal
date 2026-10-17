import type { Metadata } from "next";
import OpenPlatformSolutionView from "@/components/products/OpenPlatformSolutionView";
import openPlatformData from "@/data/content/open-platform.json";

export const metadata: Metadata = {
  title: openPlatformData.en.hero.badge,
  description: openPlatformData.en.hero.subtitle,
  alternates: { canonical: "https://xworktech.com/products/open-platform" },
};

export default function OpenPlatformPage() {
  return <OpenPlatformSolutionView />;
}
