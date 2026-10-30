import { EbookCatalog } from "@/components/docs/EbookCatalog";
import { getContentLanguage } from "@server/contentLanguage";
export const revalidate = 300;
export const metadata = { title: "电子书目录 | XWork Docs" };
export default async function EbooksPage() {
  const isChinese = (await getContentLanguage().catch(() => "en")) === "zh";
  return <div className="space-y-6"><EbookCatalog isChinese={isChinese} showResources /></div>;
}
