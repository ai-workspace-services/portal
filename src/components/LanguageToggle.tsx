"use client";

import { useLanguage } from "../i18n/LanguageProvider";

/**
 * 语言切换器。
 *
 * size 决定控件高度，需与所在导航栏的相邻控件对齐：
 *   "sm" = 32px —— 控制台 Header，邻居是 h-8 的图标按钮与徽标
 *   "md" = 36px —— 营销导航栏，邻居是基础尺寸的 xds-btn
 *
 * 此前固定渲染为 42px（min-h-10 叠加 tactile-control 的内边距），
 * 在两处都比邻居高出一截：营销栏里挨着 28px 的 CTA，控制台里挨着 32px 的按钮。
 */
export default function LanguageToggle({
  size = "sm",
}: {
  size?: "sm" | "md";
}) {
  const { language, setLanguage } = useLanguage();
  const height = size === "md" ? "h-9" : "h-8";

  return (
    <div className={`tactile-control relative inline-flex ${height}`}>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as "en" | "zh")}
        aria-label="Language switcher"
        className="h-full appearance-none bg-transparent pl-3 pr-9 text-sm font-medium text-text outline-none"
      >
        <option value="en">English</option>
        <option value="zh">中文</option>
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-text-subtle">
        <svg
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          aria-hidden="true"
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </div>
  );
}
