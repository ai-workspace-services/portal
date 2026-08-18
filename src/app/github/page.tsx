import { redirect } from "next/navigation";

/**
 * 开源仓库入口。导航里挂的是站内 /github，跳转目标只在这里维护一处，
 * 换组织或换仓库时不用动内容数据，也便于后续加统计。
 */
export const dynamic = "force-static";

export const metadata = {
  title: "开源仓库",
  robots: { index: false, follow: true },
};

export default function GithubRedirectPage() {
  redirect("https://github.com/ai-workspace-lab");
}
