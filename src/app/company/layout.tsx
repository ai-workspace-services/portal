import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company Information - XWork Technologies LLC",
  description: "Official company information for XWork Technologies LLC, a software development company specializing in AI-powered productivity tools, developer platforms, and cloud-neutral infrastructure.",
  openGraph: {
    title: "Company Information - XWork Technologies LLC",
    description: "Official company information for XWork Technologies LLC, a software development company specializing in AI-powered productivity tools, developer platforms, and cloud-neutral infrastructure.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
