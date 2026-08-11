import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const portalRoot = resolve(scriptDirectory, "..");
const outputDirectory = join(portalRoot, "public/marketing/home-editions");
const imageDirectory = join(portalRoot, "public/marketing/home-hero");
const temporaryDirectory = join(portalRoot, ".tmp/home-edition-slides");

const canvas = { width: 1536, height: 960 };

const editions = [
  {
    key: "web",
    image: "web-workspace-flow.png",
    label: { en: "Web Edition", zh: "Web 版" },
    title: {
      en: ["AI Workspace", "Control Center"],
      zh: ["AI 工作空间", "控制中心"],
    },
    description: {
      en: "Unify tasks, conversations, projects, and knowledge for efficient, controlled work.",
      zh: "统一任务、对话、项目与知识，让工作高效且可控。",
    },
    benefits: {
      en: [
        ["Task Management", "See progress at a glance"],
        ["AI Conversations", "Collaborate efficiently with AI"],
        ["Projects & Knowledge", "Centralize work and knowledge"],
        ["Data Insights", "Trends, analysis, and guidance"],
      ],
      zh: [
        ["任务管理", "进度一目了然"],
        ["AI 对话", "与 AI 高效协作"],
        ["项目与知识", "集中管理工作与知识"],
        ["数据洞察", "趋势、分析与指引"],
      ],
    },
  },
  {
    key: "desktop",
    image: "desktop-ai-delivery.png",
    label: { en: "Desktop Edition", zh: "桌面版" },
    title: {
      en: ["Create with focus.", "Stay in control."],
      zh: ["专注创作，", "始终掌控。"],
    },
    description: {
      en: "A powerful local experience for focused creation and delivery.",
      zh: "为专注创作与高效交付而生的强大本地体验。",
    },
    benefits: {
      en: [
        ["Service Connections", "Connect to services quickly"],
        ["Local Task Sync", "Work offline, sync automatically"],
        ["Plugins & Extensions", "Extend capabilities on demand"],
        ["Run Logs", "Transparent and traceable"],
      ],
      zh: [
        ["服务连接", "快速连接所需服务"],
        ["本地任务同步", "离线工作，自动同步"],
        ["插件与扩展", "按需扩展能力"],
        ["运行日志", "透明且可追溯"],
      ],
    },
  },
  {
    key: "mobile",
    image: "mobile-session-continuity.png",
    label: { en: "Mobile Edition", zh: "移动版" },
    title: {
      en: ["Stay in control,", "wherever work happens."],
      zh: ["工作随行，", "掌控始终在线。"],
    },
    description: {
      en: "A mobile work experience without limits on ideas or progress.",
      zh: "不受地点限制，让灵感与进度始终保持同步。",
    },
    benefits: {
      en: [
        ["Mobile Access", "Access your workspace anywhere"],
        ["Secure Access", "Encrypted, safe, and reliable"],
        ["Quick Switching", "Switch environments in one tap"],
        ["Task Follow-up", "Keep every task on track"],
      ],
      zh: [
        ["移动访问", "随时访问你的工作空间"],
        ["安全访问", "加密、安全、可靠"],
        ["快速切换", "一键切换工作环境"],
        ["任务跟进", "让每项任务保持正轨"],
      ],
    },
  },
];

function escapeXml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[character],
  );
}

function wrapText(text, maxLength) {
  const words = text.split(" ");
  if (words.length === 1) return [text];

  return words.reduce(
    (lines, word) => {
      const lastLine = lines.at(-1) ?? "";
      if (`${lastLine} ${word}`.trim().length > maxLength) {
        lines.push(word);
      } else {
        lines[lines.length - 1] = `${lastLine} ${word}`.trim();
      }
      return lines;
    },
    [""],
  );
}

function textLines(lines, x, y, options = {}) {
  const {
    fill = "#0F172A",
    fontSize = 26,
    fontWeight = 400,
    lineHeight = Math.round(fontSize * 1.35),
    anchor = "start",
  } = options;

  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}" fill="${fill}" font-size="${fontSize}" font-weight="${fontWeight}">${escapeXml(line)}</text>`,
    )
    .join("\n");
}

function slideSvg(edition, language) {
  const label = edition.label[language];
  const title = edition.title[language];
  const description = edition.description[language];
  const benefits = edition.benefits[language];
  const sourceImage = `data:image/png;base64,${readFileSync(
    join(imageDirectory, edition.image),
  ).toString("base64")}`;
  const descriptionLines =
    language === "en" ? wrapText(description, 49) : [description];
  const titleMarkup = textLines(title, 76, 207, {
    fill: "#101828",
    fontSize: 54,
    fontWeight: 750,
    lineHeight: 72,
  });
  const benefitMarkup = benefits
    .map(([titleText, bodyText], index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = 76 + column * 280;
      const y = 435 + row * 122;
      return `
        <g transform="translate(${x}, ${y})">
          <rect width="252" height="96" rx="18" fill="#FFFFFF" fill-opacity="0.74" stroke="#D7E5FF"/>
          <circle cx="27" cy="28" r="12" fill="#E4EEFF"/>
          <path d="M21 28h12M27 22v12" stroke="#165DFF" stroke-width="2.5" stroke-linecap="round"/>
          ${textLines([titleText], 48, 33, { fontSize: 16, fontWeight: 700 })}
          ${textLines([bodyText], 22, 66, { fill: "#64748B", fontSize: 12, fontWeight: 400 })}
        </g>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F8FBFF"/>
      <stop offset="0.58" stop-color="#EEF5FF"/>
      <stop offset="1" stop-color="#DCEBFF"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#A9CBFF" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#A9CBFF" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="24" stdDeviation="22" flood-color="#2055A8" flood-opacity="0.20"/>
    </filter>
    <clipPath id="screenClip"><rect x="690" y="130" width="770" height="598" rx="28"/></clipPath>
    <style>
      text { font-family: 'SF Pro Display', 'PingFang SC', 'Arial', sans-serif; }
    </style>
  </defs>
  <rect width="1536" height="960" fill="url(#background)"/>
  <circle cx="1360" cy="150" r="400" fill="url(#glow)"/>
  <circle cx="590" cy="920" r="410" fill="url(#glow)" opacity="0.5"/>
  <g opacity="0.55" fill="none" stroke="#BCD7FF" stroke-width="1">
    <circle cx="1330" cy="160" r="290"/><circle cx="1330" cy="160" r="355"/>
  </g>
  <g transform="translate(76, 92)">
    <rect width="160" height="42" rx="21" fill="#E0ECFF"/>
    <circle cx="25" cy="21" r="11" fill="#165DFF"/>
    <path d="M19 21h12M25 15v12" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
    <text x="47" y="27" fill="#0F55D8" font-size="17" font-weight="700">${escapeXml(label)}</text>
  </g>
  ${titleMarkup}
  ${textLines(descriptionLines, 76, 365, { fill: "#334155", fontSize: 22, fontWeight: 400, lineHeight: 32 })}
  ${benefitMarkup}
  <g filter="url(#shadow)">
    <rect x="670" y="110" width="810" height="638" rx="34" fill="#FFFFFF" fill-opacity="0.86"/>
    <rect x="690" y="130" width="770" height="598" rx="28" fill="#E7F0FF"/>
    <image href="${sourceImage}" x="704" y="162" width="742" height="535" preserveAspectRatio="xMidYMid meet" clip-path="url(#screenClip)"/>
    <rect x="690" y="130" width="770" height="598" rx="28" fill="none" stroke="#FFFFFF" stroke-width="4"/>
    <g transform="translate(712, 145)">
      <circle cx="6" cy="6" r="4" fill="#FF6B6B"/><circle cx="20" cy="6" r="4" fill="#FFCB45"/><circle cx="34" cy="6" r="4" fill="#4CCB84"/>
    </g>
  </g>
  <g transform="translate(76, 822)">
    <rect width="278" height="48" rx="24" fill="#165DFF"/>
    <text x="139" y="31" text-anchor="middle" fill="#FFFFFF" font-size="17" font-weight="700">XWorkmate · AI Workspace</text>
  </g>
</svg>`;
}

rmSync(temporaryDirectory, { recursive: true, force: true });
mkdirSync(temporaryDirectory, { recursive: true });
mkdirSync(outputDirectory, { recursive: true });

for (const edition of editions) {
  for (const language of ["zh", "en"]) {
    const filename = `${edition.key}-${language}.png`;
    const temporarySvg = join(
      temporaryDirectory,
      `${edition.key}-${language}.svg`,
    );
    writeFileSync(temporarySvg, slideSvg(edition, language));
    execFileSync("sips", [
      "-s",
      "format",
      "png",
      temporarySvg,
      "--out",
      join(outputDirectory, filename),
    ]);
  }
}

rmSync(temporaryDirectory, { recursive: true, force: true });
