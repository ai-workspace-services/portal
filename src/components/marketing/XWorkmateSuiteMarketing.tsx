import Image from "next/image";
import Link from "next/link";
import {
  AppWindow,
  ArrowRight,
  Bot,
  Boxes,
  CheckCircle2,
  Cloud,
  Code2,
  FolderArchive,
  GitBranch,
  Layers3,
  Plug,
  ServerCog,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";

type SuiteProduct = {
  name: string;
  repo: string;
  role: string;
  description: string;
  icon: typeof AppWindow;
};

const suiteProducts: SuiteProduct[] = [
  {
    name: "xworkmate-app",
    repo: "x-evor/xworkmate-app",
    role: "桌面工作台",
    description:
      "承载任务线程、执行模式、工作区文件和产物预览，让用户在 macOS 客户端内完成 AI Agent 工作流。",
    icon: AppWindow,
  },
  {
    name: "xworkmate-bridge",
    repo: "x-evor/xworkmate-bridge",
    role: "网关与运行时连接",
    description:
      "连接你的桌面工作区与远程 OpenClaw 运行环境，让长任务可以继续跑、可恢复、可回到同一条线程。",
    icon: ServerCog,
  },
  {
    name: "openclaw-multi-session-plugins",
    repo: "x-evor/openclaw-multi-session-plugins",
    role: "多会话执行插件",
    description:
      "把 OpenClaw 扩展成可并行处理任务的执行环境，支撑多线程、归档任务和产物落盘。",
    icon: Plug,
  },
  {
    name: "xworkspace-core-skills",
    repo: "x-evor/xworkspace-core-skills",
    role: "核心技能包",
    description:
      "沉淀常用写作、编程、图片、视频和工作区处理方式，让个人任务从聊天走向稳定产物。",
    icon: Boxes,
  },
];

const outcomes = [
  "把 App Store 产品页里的能力描述落到可感知的网站入口",
  "把桌面端、网关、插件、技能包讲成一个人的 AI 工作台",
  "突出任务不断线、文件有归档、产物能预览的日常使用价值",
];

const deliverySteps = [
  {
    title: "1. Desktop workspace",
    body: "用户从 XWorkmate App 发起任务，保留上下文、线程、归档和产物目录。",
    icon: TerminalSquare,
  },
  {
    title: "2. Bridge contract",
    body: "Bridge 负责身份、端点、版本和工作区转发，不把运行时状态散落到本地配置。",
    icon: Cloud,
  },
  {
    title: "3. OpenClaw sessions",
    body: "多会话插件把任务拆到可恢复的执行线程，支持代码、文档、图片和视频产物。",
    icon: GitBranch,
  },
  {
    title: "4. Workspace skills",
    body: "核心技能包把常见任务变成可复用工作方式，让写作、代码、图片和视频制作更稳定。",
    icon: ShieldCheck,
  },
];

export default function XWorkmateSuiteMarketing() {
  return (
    <main className="relative overflow-hidden bg-background text-text">
      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 pb-10 pt-6 sm:px-6 lg:grid-cols-[0.94fr_1.06fr] lg:px-8 lg:pb-14 lg:pt-10">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-[8px] border border-surface-border bg-white/88 px-3 py-1.5 text-xs font-semibold text-text-muted shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            XWorkmate Suite
          </div>
          <h1 className="mt-5 max-w-3xl text-[2.7rem] font-semibold leading-[0.98] tracking-normal text-slate-950 sm:text-[4.2rem]">
            XWorkmate 产品矩阵
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-muted sm:text-lg">
            从桌面工作台到网关、插件与核心技能，把个人 AI
            助手变成能持续处理任务的工作区。
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/download"
              className="tactile-button tactile-button-primary h-11 px-5"
            >
              下载客户端
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="https://github.com/x-evor/xworkmate-app.git"
              className="tactile-button tactile-button-soft h-11 px-5"
            >
              查看开源仓库
            </Link>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {outcomes.map((item) => (
              <div
                key={item}
                className="rounded-[8px] border border-surface-border bg-white/86 p-3 text-sm leading-5 text-text-muted shadow-sm"
              >
                <CheckCircle2
                  className="mb-2 h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-[16px] border border-surface-border bg-white shadow-[var(--shadow-lg)]">
            <Image
              src="/marketing/xworkmate-suite-hero.png"
              alt="XWorkmate 产品矩阵营销页面视觉稿"
              width={1536}
              height={864}
              priority
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-text-subtle">
              Product matrix
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">
              四个仓库，一个人的 AI 工作台
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-text-muted">
            页面主张不只讲“聊天更聪明”，而是展示任务线程、远程执行、多会话处理和文件产物如何服务个人工作流。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {suiteProducts.map(
            ({ name, repo, role, description, icon: Icon }) => (
              <article
                key={name}
                className="flex min-h-[270px] flex-col rounded-[8px] border border-surface-border bg-white/92 p-5 shadow-[var(--shadow-soft)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-[8px] border border-primary-border bg-primary-muted p-2 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="rounded-[8px] bg-background-muted px-2.5 py-1 text-xs font-semibold text-text-muted">
                    {role}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-semibold tracking-normal text-slate-950">
                  {name}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-text-muted">
                  {description}
                </p>
                <Link
                  href={`https://github.com/${repo}`}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover"
                >
                  {repo}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ),
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[16px] border border-surface-border bg-white/92 p-5 shadow-[var(--shadow-md)] lg:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-[8px] border border-surface-border bg-background-muted px-3 py-1.5 text-xs font-semibold text-text-muted">
                <Layers3 className="h-4 w-4" aria-hidden="true" />
                Delivery architecture
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-normal text-slate-950">
                从聊天窗口到个人工作区
              </h2>
              <p className="mt-3 text-sm leading-6 text-text-muted">
                新页面的核心是把产品矩阵解释成一个人的使用闭环：客户端承载任务线程，Bridge
                连接运行环境，OpenClaw 插件处理多会话任务，Core Skills
                帮助产出文件、图片、视频和代码。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {deliverySteps.map(({ title, body, icon: Icon }) => (
                <article
                  key={title}
                  className="rounded-[8px] border border-surface-border bg-background/80 p-4"
                >
                  <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 text-base font-semibold tracking-normal text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    {body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
          <div className="rounded-[8px] border border-surface-border bg-white/92 p-5 shadow-sm">
            <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold tracking-normal text-slate-950">
              面向用户
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              持续任务线程、多执行模式、可恢复上下文和文件产物，让个人把 AI
              助手当成日常工作台使用。
            </p>
          </div>
          <div className="rounded-[8px] border border-surface-border bg-white/92 p-5 shadow-sm">
            <Code2 className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-lg font-semibold tracking-normal text-slate-950">
              面向创作者与开发者
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              可以写代码、整理资料、制作图片视频，也可以把耗时任务放到远程运行环境继续处理。
            </p>
          </div>
          <div className="rounded-[8px] border border-surface-border bg-white/92 p-5 shadow-sm">
            <FolderArchive
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            />
            <h2 className="mt-3 text-lg font-semibold tracking-normal text-slate-950">
              面向个人产物
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              任务归档、产物面板、文档和多媒体输出都能回看，减少只停留在聊天记录里的零散结果。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
