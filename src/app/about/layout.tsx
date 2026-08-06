import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About XWork Technologies LLC",
  description: "XWork Technologies LLC is a software development company building AI software, cloud platforms, developer tools, and SaaS products.",
  openGraph: {
    title: "About XWork Technologies LLC",
    description: "XWork Technologies LLC is a software development company building AI software, cloud platforms, developer tools, and SaaS products.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
