"use client";

import React from "react";
import Footer from "../../components/Footer";
import MarketingNav from "@/components/marketing/MarketingNav";
import { useLanguage } from "../../i18n/LanguageProvider";

type PolicySection = {
  title: string;
  body?: string[];
  bullets?: string[];
};

type PolicyContent = {
  title: string;
  subtitle: string;
  effective: string;
  updated: string;
  overview: string[];
  sections: PolicySection[];
  contactTitle: string;
  contactBody: string;
  contactEmailLabel: string;
};

const enContent: PolicyContent = {
  title: "Privacy Policy",
  subtitle: "This Privacy Policy explains how XWork Technologies LLC collects, uses, and protects your information across our AI-powered applications, cloud platforms, and SaaS products.",
  effective: "Effective Date: October 1, 2026",
  updated: "Last Updated: October 1, 2026",
  overview: [
    "XWork Technologies LLC (\"we\", \"our\", \"us\") is committed to protecting your privacy and ensuring you have a positive experience on our website and in using our software products and services.",
    "This Privacy Policy applies to our website and any SaaS platforms, developer tools, or services that link to this policy.",
    "We follow strict data-minimization practices and only process data that is required to provide our services and ensure their secure operation."
  ],
  sections: [
    {
      title: "1. Information We Collect",
      body: ["We collect information to provide better services to our users. This includes:"],
      bullets: [
        "Information you provide to us directly when creating an account or contacting us.",
        "Information collected automatically when you use our services (e.g., usage data, device information).",
        "Information from third-party services you authorize us to connect with."
      ]
    },
    {
      title: "2. Account Information",
      body: ["When you register for an account, we collect necessary identifying information:"],
      bullets: [
        "Email address and chosen username.",
        "Authentication credentials and secure tokens.",
        "Profile information you choose to provide."
      ]
    },
    {
      title: "3. Product Usage Data",
      body: ["To maintain and improve our AI applications and cloud-native platforms, we collect:"],
      bullets: [
        "Log data, including IP address, browser type, and access times.",
        "Diagnostic data necessary to resolve technical issues.",
        "Feature usage metrics to help us optimize the user experience."
      ]
    },
    {
      title: "4. Communication Information",
      body: ["When you contact our support or sales teams, we may collect and store:"],
      bullets: [
        "Your email address and correspondence history.",
        "Information you provide to help us resolve an issue.",
        "Feedback regarding our products."
      ]
    },
    {
      title: "5. Payment Information",
      body: ["If you purchase subscriptions or services from us:"],
      bullets: [
        "We use secure third-party payment processors to handle transactions.",
        "We do not directly store or process full credit card numbers or payment authentication data.",
        "We retain billing and subscription status data for accounting and service delivery purposes."
      ]
    },
    {
      title: "6. Third-party Services",
      body: ["We do not sell your personal data. We may share necessary data with third parties exclusively for providing our services:"],
      bullets: [
        "Cloud infrastructure providers that host our platforms.",
        "Payment processors for billing operations.",
        "Authentication providers for secure login processes."
      ]
    },
    {
      title: "7. Data Security",
      body: [
        "We implement industry-standard technical and organizational measures to secure your data. This includes encryption in transit, access controls, and regular security reviews.",
        "While we strive to protect your personal information, no system is entirely secure, and we cannot guarantee absolute security."
      ]
    },
    {
      title: "8. Data Retention",
      body: [
        "We retain your information only as long as necessary to fulfill the purposes outlined in this policy, comply with legal obligations, and resolve disputes.",
        "Upon account deletion, your personal data will be securely deleted or anonymized, except for information we are legally required to maintain."
      ]
    },
    {
      title: "9. User Rights",
      body: ["Depending on your location, you may have rights regarding your personal information:"],
      bullets: [
        "The right to access, update, or delete your personal information.",
        "The right to restrict or object to our processing of your data.",
        "The right to export your data in a portable format."
      ]
    },
    {
      title: "10. Contact Information",
      body: ["If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us."]
    }
  ],
  contactTitle: "Contact",
  contactBody: "For privacy-related inquiries, please contact XWork Technologies LLC at:",
  contactEmailLabel: "Privacy Contact Email"
};

const zhContent: PolicyContent = {
  title: "隐私政策",
  subtitle: "本隐私政策说明了 XWork Technologies LLC 如何在我们的 AI 应用程序、云平台和 SaaS 产品中收集、使用和保护您的信息。",
  effective: "生效日期：2026年10月1日",
  updated: "最后更新：2026年10月1日",
  overview: [
    "XWork Technologies LLC（“我们”）致力于保护您的隐私，确保您在使用我们的网站、软件产品和服务时获得良好的体验。",
    "本隐私政策适用于链接至本政策的网站及任何 SaaS 平台、开发者工具或服务。",
    "我们遵循严格的数据最小化原则，仅处理提供服务和保障其安全运行所必需的数据。"
  ],
  sections: [
    {
      title: "1. 我们收集的信息",
      body: ["我们收集信息以提供更好的服务，这包括："],
      bullets: [
        "您在创建帐户或联系我们时直接提供的信息。",
        "在您使用服务时自动收集的信息（如使用数据、设备信息）。",
        "您授权我们连接的第三方服务所提供的信息。"
      ]
    },
    {
      title: "2. 帐户信息",
      body: ["当您注册帐户时，我们会收集必要的身份信息："],
      bullets: [
        "电子邮件地址和用户名。",
        "身份验证凭据和安全令牌。",
        "您选择提供的个人资料信息。"
      ]
    },
    {
      title: "3. 产品使用数据",
      body: ["为了维护和改进我们的 AI 应用程序和云原生平台，我们收集："],
      bullets: [
        "日志数据，包括 IP 地址、浏览器类型和访问时间。",
        "解决技术问题所必需的诊断数据。",
        "帮助我们优化用户体验的功能使用指标。"
      ]
    },
    {
      title: "4. 通信信息",
      body: ["当您联系我们的支持或销售团队时，我们可能会收集和存储："],
      bullets: [
        "您的电子邮件地址和通信记录。",
        "您为帮助我们解决问题而提供的信息。",
        "关于我们产品的反馈。"
      ]
    },
    {
      title: "5. 支付信息",
      body: ["如果您向我们购买订阅或服务："],
      bullets: [
        "我们使用安全的第三方支付处理商来处理交易。",
        "我们不直接存储或处理完整的信用卡号或支付验证数据。",
        "我们保留账单和订阅状态数据，以用于会计和提供服务。"
      ]
    },
    {
      title: "6. 第三方服务",
      body: ["我们不会出售您的个人数据。我们仅在提供服务所必需的情况下与第三方共享数据："],
      bullets: [
        "托管我们平台的云基础设施提供商。",
        "处理计费操作的支付处理商。",
        "用于安全登录流程的身份验证提供商。"
      ]
    },
    {
      title: "7. 数据安全",
      body: [
        "我们实施行业标准的技术和组织措施来保护您的数据，包括传输中的加密、访问控制和定期安全审查。",
        "虽然我们努力保护您的个人信息，但没有任何系统是绝对安全的，因此我们无法保证绝对的安全性。"
      ]
    },
    {
      title: "8. 数据保留",
      body: [
        "我们仅在实现本政策所述目的、遵守法律义务和解决争议所必需的时间内保留您的信息。",
        "删除帐户后，您的个人数据将被安全删除或匿名化，但法律要求我们保留的信息除外。"
      ]
    },
    {
      title: "9. 用户权利",
      body: ["根据您所在的地区，您可能对自己的个人信息拥有以下权利："],
      bullets: [
        "访问、更新或删除您个人信息的权利。",
        "限制或反对此类数据处理的权利。",
        "以可移植格式导出数据的权利。"
      ]
    },
    {
      title: "10. 联系信息",
      body: ["如果您对本隐私政策有任何问题、疑虑或请求，请联系我们。"]
    }
  ],
  contactTitle: "联系我们",
  contactBody: "有关隐私相关咨询，请联系 XWork Technologies LLC：",
  contactEmailLabel: "隐私联系邮箱"
};

function renderSection(section: PolicySection) {
  return (
    <section
      key={section.title}
      className="rounded-2xl border border-surface-border bg-surface p-6"
    >
      <h2 className="mb-4 text-xl font-semibold text-heading">
        {section.title}
      </h2>
      {section.body?.map((paragraph) => (
        <p key={paragraph} className="mb-3 leading-7 text-text-muted">
          {paragraph}
        </p>
      ))}
      {section.bullets ? (
        <ul className="list-disc space-y-3 pl-5 text-text-muted">
          {section.bullets.map((bullet) => (
            <li key={bullet} className="leading-7">
              {bullet}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export default function PrivacyPage() {
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const content = isChinese ? zhContent : enContent;

  return (
    <div className="min-h-screen bg-background text-text transition-colors duration-150 flex flex-col">
      <MarketingNav />

      <main className="flex-1 relative overflow-hidden pt-24 pb-20">
        <div
          className="absolute inset-0 bg-gradient-app-from opacity-20 pointer-events-none"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl px-6">
          <div className="mb-10 space-y-5">
            <div className="inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-sm font-medium text-primary">
              XWork Technologies LLC
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-heading sm:text-5xl">
                {content.title}
              </h1>
              <p className="max-w-3xl text-base leading-7 text-text-muted sm:text-lg">
                {content.subtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-muted">
              <span>{content.effective}</span>
              <span>{content.updated}</span>
            </div>
          </div>

          <section className="mb-8 rounded-3xl border border-surface-border bg-surface-muted/50 p-6 sm:p-8">
            <div className="space-y-4">
              {content.overview.map((paragraph) => (
                <p key={paragraph} className="leading-7 text-text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <div className="space-y-6">{content.sections.map(renderSection)}</div>

          <section className="mt-8 rounded-3xl border border-primary/15 bg-primary/5 p-6 sm:p-8">
            <h2 className="mb-3 text-2xl font-semibold text-heading">
              {content.contactTitle}
            </h2>
            <p className="mb-4 leading-7 text-text-muted">
              {content.contactBody}
            </p>
            <p className="text-sm font-medium text-text-muted">
              {content.contactEmailLabel}
            </p>
            <a
              href="mailto:haitaopan@xworktech.com"
              className="mt-2 inline-flex text-base font-semibold text-primary transition-colors hover:text-primary-hover"
            >
              haitaopan@xworktech.com
            </a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
