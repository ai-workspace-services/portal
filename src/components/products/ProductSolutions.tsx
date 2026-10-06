"use client";

import { ArrowUpRight, BookOpen, GitBranch } from "lucide-react";

import BoundaryLink from "@/components/common/BoundaryLink";
import type { WebsiteSolutionGroupPayload } from "@/lib/docsServiceClient";

interface ProductSolutionsProps {
  solutions?: WebsiteSolutionGroupPayload[];
  language?: string;
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export default function ProductSolutions({
  solutions,
  language = "zh",
}: ProductSolutionsProps) {
  if (!solutions?.length) return null;

  const isEn = language === "en";

  return (
    <section className="xds-section" id="solutions">
      <div className="xds-container">
        <div className="xds-sec-head">
          <span className="xds-t-eyebrow">
            {isEn ? "Solutions" : "解决方案"}
          </span>
          <h2 className="xds-t-h1">
            {isEn
              ? "Architecture, delivery, and implementation paths"
              : "架构、交付与实现路径"}
          </h2>
          <p className="xds-t-lead">
            {isEn
              ? "Start with a focused category, then follow the published documentation and source repositories."
              : "按主题进入精选入口，再继续查看已发布文档与实现仓库。"}
          </p>
        </div>

        <div
          className="xds-grid"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "var(--sp-5)",
          }}
        >
          {solutions.map((solution) => (
            <article
              key={solution.title}
              className="rounded-[1rem] border border-slate-900/8 bg-white p-5 shadow-[var(--shadow-soft)]"
            >
              <h3 className="xds-t-h2">{solution.title}</h3>
              {solution.description ? (
                <p
                  className="xds-t-body-sm xds-muted"
                  style={{ marginTop: 10 }}
                >
                  {solution.description}
                </p>
              ) : null}
              <ul className="mt-4 grid gap-2">
                {solution.links.map((link) => {
                  const external = isExternalHref(link.href);
                  const Icon =
                    external && link.href.includes("github.com")
                      ? GitBranch
                      : BookOpen;
                  const content = (
                    <>
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{link.label}</span>
                      {external ? (
                        <ArrowUpRight
                          className="ml-auto h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />
                      ) : null}
                    </>
                  );

                  return (
                    <li key={`${solution.title}-${link.href}`}>
                      <BoundaryLink
                        href={link.href}
                        className="xds-link-arrow"
                        {...(external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        {content}
                      </BoundaryLink>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
