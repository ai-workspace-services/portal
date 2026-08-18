"use client";

/**
 * 产品页向导 —— Micro SaaS 模版
 * 设计稿：ai-workspace-services/.github → design-system/micro-saas-模版
 *
 * 向导是转化主干而不是装饰：三格无缝拼接、STEP 0N 眉标、
 * 区块末尾只留一个 primary 按钮（规范第 5.1 节：一个视觉区块只能有一个 primary）。
 * 数据契约不变（WebsiteWizardPayload）。
 */

import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { WebsiteWizardPayload } from "@/lib/docsServiceClient";

interface ProductWizardProps {
  wizard: WebsiteWizardPayload;
  language?: string;
}

export default function ProductWizard({
  wizard,
  language = "zh",
}: ProductWizardProps) {
  if (!wizard?.steps?.length) {
    return null;
  }

  const isEn = language === "en";
  const steps = wizard.steps;
  // 三步以内并排无缝拼接，超过三步退回等宽网格，避免挤成一条
  const columns = Math.min(steps.length, 3);

  return (
    <section className="xds-section" id="wizard">
      <div className="xds-container">
        <div className="xds-sec-head">
          <span className="xds-t-eyebrow">{isEn ? "Get started" : "Get started"}</span>
          <h2 className="xds-t-h1">{wizard.title}</h2>
          {wizard.description ? (
            <p className="xds-t-lead">{wizard.description}</p>
          ) : null}
        </div>

        <div
          className="xds-grid xds-wizard"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 0,
          }}
        >
          {steps.map((step, idx) => (
            <article key={`${step.step}-${idx}`} className="xds-wizard-card">
              <div className="xds-row-between">
                <span className="xds-wizard-idx">
                  STEP {String(step.step ?? idx + 1).padStart(2, "0")}
                </span>
              </div>
              <h3>{step.title}</h3>
              <p className="xds-t-body-sm xds-muted">{step.description}</p>

              {step.platforms || step.link ? (
                <div className="xds-wizard-visual">
                  {step.platforms ? (
                    <p className="xds-t-caption">{step.platforms}</p>
                  ) : null}
                  {step.link ? (
                    <Link
                      href={step.link}
                      className="xds-link-arrow xds-t-caption"
                      style={{ display: "inline-flex", marginTop: 12 }}
                    >
                      {isEn ? "Open" : "前往"}
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        <div className="xds-row" style={{ marginTop: 24, gap: 12 }}>
          <Link href="/register" className="xds-btn xds-btn-primary">
            {isEn ? "Create an account, start step 1" : "创建账户，开始第 1 步"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <Link href="/docs" className="xds-link-arrow">
            {isEn ? "Read the full guide first" : "先看完整部署文档"}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
