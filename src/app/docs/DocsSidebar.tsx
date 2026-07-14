"use client";

import { usePathname } from "next/navigation";
import { SidebarRoot } from "../../components/layout/SidebarRoot";
import { DocsSidebarContent } from "./DocsSidebarContent";
import { useLanguage } from "@/i18n/LanguageProvider";
import docsHomeContent from "@/data/content/docs-home.json";

export default function DocsSidebar() {
  const pathname = usePathname();
  const { language } = useLanguage();
  
  const content = docsHomeContent[language as keyof typeof docsHomeContent] || docsHomeContent.zh;
  const collections = content.collections || [];

  return (
    <SidebarRoot className="sticky top-[calc(var(--app-shell-nav-offset)+0.75rem)] hidden h-[calc(100vh-var(--app-shell-nav-offset)-1rem)] w-72 shrink-0 rounded-[14px] border border-surface-border/80 bg-white/78 px-4 py-5 shadow-[var(--shadow-soft)] backdrop-blur lg:block">
      <DocsSidebarContent collections={collections} activePath={pathname} />
    </SidebarRoot>
  );
}
