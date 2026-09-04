---
name: ui-typography
description: Use when writing or reviewing any UI that renders text in this repo — picking a font size, adding a heading, styling a card, label, badge or table cell, adjusting line height or font weight, or reviewing a diff that touches globals.css, xds.css, tailwind.config.js, or any className carrying a text-* utility. Defines the single 13-step type ladder, the Tailwind class for each step, the three sanctioned exceptions, and the guard script that fails the build on violations.
license: Internal use only
metadata:
  owner: x-evor
  distribution: clawhub-compatible
  package-format: .skill
---

# UI Typography

全站字号只有一条阶梯，定义在 `src/app/globals.css` 的 `:root`。这里是唯一来源。

## 为什么有这条规范

2026-09 之前，站点同时跑着两套字号 token（`globals.css` 的 `--type-*` 与 `xds.css` 的
`--fs-*`），外加 182 处写死的字号。浏览器实测首页有 16 种字号、23 种字号字重组合，
其中 51.2 / 19.684 / 16.8 / 13.76 / 12.48 / 11.438px 不在任何刻度上；同一角色在不同
页面尺寸不一致（正文 13/14/15px，区块标题 28/36px）。

漂移的根因不是有人粗心，而是**旧规范给的是区间**（"12px 到 13px"、"24px 到 28px"）。
区间等于没有规范。所以下面全是确定值，并且有脚本强制。

## 阶梯

| Token | px | Tailwind class | 用途 |
|---|---|---|---|
| `--fs-eyebrow` | 11 | `text-eyebrow` | 全大写眉标 |
| `--fs-micro` | 12 | `text-xs` | 标签 / 表头 / 角标 |
| `--fs-caption` | 13 | `text-caption` | 辅助说明 / 脚注 |
| `--fs-body-sm` | 14 | `text-sm` | 控制台正文（密度优先） |
| `--fs-body` | 15 | `text-body` | 默认正文 |
| `--fs-body-lg` | 16 | `text-base` | marketing 正文（阅读优先） |
| `--fs-h4` | 18 | `text-lg` | 卡片 / 小节标题 |
| `--fs-h3` | 20 | `text-xl` | 区块小标题 |
| `--fs-h2` | 24 | `text-2xl` | 区块标题 |
| `--fs-h1` | 30 | `text-3xl` | 页面标题 |
| `--fs-display-3` | 36 | `text-4xl` | 大区块标题 |
| `--fs-display-2` | 48 | `text-5xl` | section hero |
| `--fs-display-1` | 40→60 | `text-hero` | 首屏 hero，`clamp(2.5rem, 6vw, 3.75rem)` |

`text-xs` … `text-6xl` 的 px 值与 Tailwind 默认完全一致，因此这条阶梯不会与任何
Tailwind 习惯冲突。`text-eyebrow` / `text-caption` / `text-body` 是本项目补的三级。

## 怎么选

先问这段文字**是什么角色**，再从上表取值。不要先想"这里看着该多大"。

- 正文：marketing 页面用 `text-base`(16)，控制台与密集表格用 `text-sm`(14)，
  两者之间的过渡场景用 `text-body`(15)。同一个页面里正文只能有一种。
- 标题：按层级从 `text-3xl` 往下取，**不要跳级**，也不要为了"看起来重要"越级。
- 辅助文字：说明用 `text-caption`(13)，标签角标用 `text-xs`(12)，
  全大写眉标用 `text-eyebrow`(11)。11px 是下限，没有更小的一级。

## 行高与字重

行高由字号步进自动带出，通常不需要单独指定。需要显式写时用 token：

| Token | 值 | 用于 |
|---|---|---|
| `--lh-display` | 1.1 | display / hero |
| `--lh-heading` | 1.25 | 标题 |
| `--lh-snug` | 1.4 | 表单控件、紧凑标签 |
| `--lh-body` | 1.6 | 正文（中文正文不得低于此值） |
| `--lh-relaxed` | 1.75 | 长文阅读 |

字重只用四档：正文 `--fw-regular`(400)、强调 `--fw-medium`(500)、
标题 `--fw-semibold`(600)、**仅 hero** `--fw-bold`(700)。

小字（≤14px）上不要用 700。改造前 13.76px 和 11.438px 上出现的 700 字重，
是"轻重不一致"的主要来源。

> 现状：组件里仍存在既有的 `font-bold` 未收敛，14px 与 24px 上仍可观察到 700。
> 收敛需逐处判断语义，尚未进行。新代码请遵守上面的规则，不要扩大存量。

## 三处受控例外

只有这三处允许不落在阶梯上，且都已在代码里注释：

| 位置 | 取值 | 原因 |
|---|---|---|
| `.hero-product-title` / `.hero-capability span` | `cqw` | 六边形图形内部文字随容器等比缩放，固定字号会破坏图形 |
| `.public-doc-prose code` | `0.9em` | 行内代码需相对所在段落取值 |
| `.xds-t-mono` | `0.92em` | 等宽字体字面高度偏小，需相对收一档才视觉等大 |

新增例外需要在 PR 里说明理由，并同步更新守卫脚本的放行规则。

## 禁止

- 禁止 `text-[13px]`、`text-[0.7rem]` 这类任意值 class
- 禁止内联 `style={{ fontSize: 14 }}`，需要内联时写 `fontSize: "var(--fs-caption)"`
- 禁止在 CSS 里写字面量 `font-size: 0.86rem`
- 禁止在 `globals.css` 之外定义 `--fs-*`
- 禁止在 `@media` 里重定义阶梯变量。需要随视口收放的用 `clamp()` 写进 token 本身，
  按断点覆盖会重新制造多来源

`.xds` 作用域不自带阶梯，整体继承 `:root`。修改阶梯只改 `globals.css` 一处。

## 守卫

```bash
bash skills/ui-typography/scripts/check-type-scale.sh
```

已接入 `yarn lint`，五项检查覆盖上面全部禁止项。改动排版后必须跑通。

## 验证

改动排版后，在 **1440px** 视口下实测计算字号，不要只看代码：

```js
// 在页面控制台执行，列出所有落在阶梯外的字号
const L=[11,12,13,14,15,16,18,20,24,30,36,48,60];
const s=new Set();
document.querySelectorAll('body *').forEach(el=>{
  if(!Array.from(el.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))return;
  s.add(Math.round(parseFloat(getComputedStyle(el).fontSize)*100)/100);
});
[...s].sort((a,b)=>a-b).filter(x=>!L.includes(x));
```

预期只剩上表三处例外产生的值。至少覆盖一个 marketing 页与一个控制台页——
两者密度不同，是历史上最容易分叉的地方。
