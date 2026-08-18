/**
 * /docs 首页已并入 /support（同一份帮助中心设计稿 04-help-center.html 的落地页，
 * 不再维护两份重复内容）。文章正文仍留在 /docs/[collection]/[slug]，只有这个
 * 首页跳转，深链接和站内其它页面上散落的 /docs 链接不用逐个改。
 */
import { redirect } from "next/navigation";

export default function DocsHomeRedirect() {
  redirect("/support");
}
