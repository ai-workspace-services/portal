import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | XWork Technologies LLC",
  description: "Contact XWork Technologies LLC for partnership, product, and business inquiries regarding AI software, cloud platforms, and developer tools.",
  openGraph: {
    title: "Contact Us | XWork Technologies LLC",
    description: "Contact XWork Technologies LLC for partnership, product, and business inquiries regarding AI software, cloud platforms, and developer tools.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
