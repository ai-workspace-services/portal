"use client";

import { useMemo, useState } from "react";

const GROUPS = [
  { name: "Anthropic", bots: ["ClaudeBot", "Claude-SearchBot", "Claude-User"] },
  { name: "百度", bots: ["Baiduspider"] },
  { name: "字节跳动", bots: ["Bytespider", "TikTokSpider", "Doubaobot"] },
] as const;

const panel = "rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-5";
const field = "w-full rounded-lg border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-heading)]";

export default function CrawlerProtection() {
  const [domain, setDomain] = useState("");
  const [provider, setProvider] = useState("none");
  const [mode, setMode] = useState("observe");
  const [selected, setSelected] = useState<string[]>(GROUPS.flatMap((group) => [...group.bots]));
  const [userAgent, setUserAgent] = useState("ClaudeBot/1.0");
  const [path, setPath] = useState("/");
  const [result, setResult] = useState("");
  const domainValid = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(domain);
  const rules = useMemo(() => selected.map((userAgent) => ({ userAgent, action: "block" })), [selected]);

  function toggle(bot: string) {
    setSelected((current) => current.includes(bot) ? current.filter((value) => value !== bot) : [...current, bot]);
    setResult("");
  }

  function simulate() {
    if (!path.startsWith("/") || path.startsWith("//")) {
      setResult("请输入以 / 开头的请求路径。");
      return;
    }
    const pathname = new URL(path, "https://example.com").pathname;
    if (pathname === "/robots.txt") {
      setResult("robots.txt 由站点原有路由处理。");
      return;
    }
    const match = selected.find((bot) => new RegExp(`(^|[^a-z0-9_-])${bot}($|[^a-z0-9_-])`, "i").test(userAgent));
    if (!match) {
      setResult("未命中所选爬虫，继续原有路由。");
    } else if (provider === "none") {
      setResult(`命中 ${match}。尚未选择边缘执行器。`);
    } else {
      setResult(mode === "observe" ? `命中 ${match}。观察模式继续原有路由。` : `命中 ${match}。拒绝模式预期返回 403。`);
    }
  }

  function download() {
    const data = { status: "draft", domain: domain.toLowerCase(), provider, mode, rules, robotsException: "/robots.txt" };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "crawler-policy-draft.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="space-y-5">
    <header>
      <h1 className="text-2xl font-semibold text-[var(--color-heading)]">站点爬虫防护</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">配置站点级爬虫策略草稿，覆盖网站和 API。</p>
    </header>
    <div className="rounded-lg border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/30 p-4 text-sm text-[var(--color-warning-foreground)]">当前页面仅生成本地草稿与模拟结果。边缘执行器和发布流程尚未接入，规则不会自动生效。</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.6fr)]">
      <section className={`${panel} space-y-4`}>
        <h2 className="font-semibold text-[var(--color-heading)]">策略草稿</h2>
        <label className="block space-y-1 text-sm">站点域名<input className={field} value={domain} onChange={(event) => setDomain(event.target.value.trim())} placeholder="example.com" /></label>
        <label className="block space-y-1 text-sm">边缘执行器<select className={field} value={provider} onChange={(event) => { setProvider(event.target.value); setResult(""); }}><option value="none">未选择</option><option value="cloudflare-free">Cloudflare Free</option><option value="other">其他 CDN</option></select></label>
        <label className="block space-y-1 text-sm">执行模式<select className={field} value={mode} onChange={(event) => { setMode(event.target.value); setResult(""); }}><option value="observe">观察模式</option><option value="block">拒绝模式</option></select></label>
        {GROUPS.map((group) => <fieldset key={group.name} className="rounded-lg border border-[color:var(--color-surface-border)] p-3"><legend className="px-1 text-sm font-semibold">{group.name}</legend><div className="flex flex-wrap gap-x-5 gap-y-2">{group.bots.map((bot) => <label key={bot} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(bot)} onChange={() => toggle(bot)} />{bot}</label>)}</div></fieldset>)}
        <p className="text-xs text-[var(--color-text-muted)]">草稿建议对 GPTBot 使用 robots.txt 声明。OpenAI 搜索与用户请求沿用站点原有策略。User-Agent 可被伪造。</p>
        <button type="button" onClick={download} disabled={!domainValid} className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">导出草稿</button>
      </section>
      <section className={`${panel} space-y-4`}>
        <div><h2 className="font-semibold text-[var(--color-heading)]">请求模拟</h2><p className="mt-1 text-xs text-[var(--color-text-muted)]">模拟结果基于当前草稿。</p></div>
        <label className="block space-y-1 text-sm">User-Agent<input className={field} value={userAgent} onChange={(event) => { setUserAgent(event.target.value); setResult(""); }} /></label>
        <label className="block space-y-1 text-sm">路径<input className={field} value={path} onChange={(event) => { setPath(event.target.value); setResult(""); }} /></label>
        <button type="button" onClick={simulate} className="rounded-lg border border-[color:var(--color-primary-border)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)]">运行模拟</button>
        {result && <p role="status" className="rounded-lg bg-[var(--color-surface-muted)] p-3 text-sm text-[var(--color-text-muted)]">{result}</p>}
      </section>
    </div>
  </div>;
}
