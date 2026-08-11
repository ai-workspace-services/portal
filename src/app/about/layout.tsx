import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About XWork Technologies LLC",
  description: "XWork Technologies LLC is a software development company building AI-powered productivity tools, cloud-neutral infrastructure, and developer platforms.",
  openGraph: {
    title: "About XWork Technologies LLC",
    description: "XWork Technologies LLC is a software development company building AI-powered productivity tools, cloud-neutral infrastructure, and developer platforms.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
