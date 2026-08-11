import Image from "next/image";

type BrandCTAProps = {
  lang?: "zh" | "en";
  variant?: "compact" | "default";
};

const COPY = {
  zh: {
    main: "云原生实践 · 架构思考",
    secondary: "获取更多信息，可通过右侧官方渠道",
  },
  en: {
    main: "Cloud-native practice · Architecture thinking",
    secondary: "For more information, see the official channels on the right",
  },
};

export default function BrandCTA({
  lang = "en",
  variant = "default",
}: BrandCTAProps) {
  const content = COPY[lang];
  const isCompact = variant === "compact";
  const imageSize = isCompact ? 132 : 168;

  return (
    <section
      className={`flex flex-col gap-5 rounded-[1.75rem] border border-slate-900/10 bg-[#fcfbf8] ${
        isCompact
          ? "p-4 sm:flex-row sm:items-center"
          : "p-5 sm:flex-row sm:items-center"
      }`}
    >
      <div className="flex-1 text-left">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-text-subtle">
          {lang === "zh" ? "官方渠道" : "Official channel"}
        </p>
        <p className="mt-3 text-base font-semibold text-slate-900">
          {content.main}
        </p>
        {!isCompact ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {content.secondary}
          </p>
        ) : null}
      </div>
      <div className="flex justify-start sm:justify-end">
        <Image
          src="/icons/webchat.jpg"
          alt={
            lang === "zh"
              ? "XWork Tech 微信二维码"
              : "XWork Tech WeChat QR code"
          }
          width={imageSize}
          height={imageSize}
          className="h-auto w-auto rounded-[1.25rem] border border-slate-900/10"
        />
      </div>
    </section>
  );
}
