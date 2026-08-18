import DocsSidebar, { DocsMobileNav } from "./DocsSidebar";
import MarketingNav from "@/components/marketing/MarketingNav";
import Footer from "@components/Footer";
import { getDocCollections } from "./resources.server";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const collections = await getDocCollections().catch(() => []);
  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      <div className="print:hidden">
        <MarketingNav />
      </div>
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-2 pb-8 pt-3 sm:px-3 lg:px-4">
        <div className="print:hidden">
          <DocsMobileNav collections={collections} />
        </div>
        <div className="flex w-full flex-1 items-start">
          <div className="print:hidden">
            <DocsSidebar collections={collections} />
          </div>
          <main className="min-h-[calc(100vh-64px)] min-w-0 flex-1 overflow-x-hidden px-3 py-3 sm:px-5 lg:px-6">
            {children}
          </main>
        </div>
      </div>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
