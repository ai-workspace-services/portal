import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | XWork Technologies LLC",
  description: "Terms of Service for XWork Technologies LLC covering use of services, accounts, subscription, intellectual property, and liability for our developer tools and cloud platforms.",
  openGraph: {
    title: "Terms of Service | XWork Technologies LLC",
    description: "Terms of Service for XWork Technologies LLC covering use of services, accounts, subscription, intellectual property, and liability for our developer tools and cloud platforms.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
