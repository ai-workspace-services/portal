import { publicDiscovery } from "@/data/content/public-discovery";

export default function AiResourceLinks({
  language = "zh",
}: {
  language?: string;
}) {
  const locale = language === "en" ? "en" : "zh";
  const links = [
    { href: "/llms.txt", label: "llms.txt" },
    { href: "/llms-full.txt", label: "llms-full.txt" },
    ...publicDiscovery.resources
      .filter(({ href }) => ["/products", "/docs"].includes(href))
      .map(({ href, label }) => ({ href, label: label[locale] })),
  ];
  return (
    <nav
      aria-label={publicDiscovery.footerLabel[locale]}
      className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 text-caption"
    >
      <span>{publicDiscovery.footerLabel[locale]}</span>
      {links.map(({ href, label }) => (
        <a
          key={href}
          href={href}
          className="underline-offset-4 hover:underline focus-visible:underline"
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
