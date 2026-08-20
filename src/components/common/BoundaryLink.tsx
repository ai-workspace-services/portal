import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { isCrossBoundaryHref, isExternalHref } from "@/lib/ssrBoundaries";

type LinkProps = ComponentProps<typeof Link>;

export type BoundaryLinkProps = Omit<LinkProps, "href"> & {
  href: string;
  children?: ReactNode;
};

/**
 * 站内链接的默认写法。同 boundary 内和单体构建时就是 next/link（软导航照旧），
 * 跨 boundary 或外链时退回原生 <a> 整页跳转。
 *
 * 为什么必须退回 <a>：见 lib/ssrBoundaries.ts 顶部。简单说跨界目标页不在当前
 * build 里，next/link 的软导航对静态预渲染目标会静默挂死（点了没反应）。
 *
 * 判定基于构建期注入的前缀表，所以新增/挪动 boundary 只改 GitOps 的
 * EdgeRoutingConfig，不用回来改组件。
 */
export default function BoundaryLink({
  href,
  children,
  ...rest
}: BoundaryLinkProps) {
  if (isExternalHref(href) || isCrossBoundaryHref(href)) {
    const {
      prefetch: _prefetch,
      replace: _replace,
      scroll: _scroll,
      shallow: _shallow,
      locale: _locale,
      ...anchorProps
    } = rest as Record<string, unknown>;

    return (
      <a href={href} {...(anchorProps as ComponentProps<"a">)}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}
