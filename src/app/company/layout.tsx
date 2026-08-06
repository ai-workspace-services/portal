import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company Information | XWork Technologies LLC",
  description: "Official company information for XWork Technologies LLC, a software development company specializing in AI software, SaaS, and cloud platforms.",
  openGraph: {
    title: "Company Information | XWork Technologies LLC",
    description: "Official company information for XWork Technologies LLC, a software development company specializing in AI software, SaaS, and cloud platforms.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
