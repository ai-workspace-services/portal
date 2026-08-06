import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | XWork Technologies LLC",
  description: "Privacy Policy for XWork Technologies LLC covering information we collect, usage data, data security, and user rights for our software products and services.",
  openGraph: {
    title: "Privacy Policy | XWork Technologies LLC",
    description: "Privacy Policy for XWork Technologies LLC covering information we collect, usage data, data security, and user rights for our software products and services.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
