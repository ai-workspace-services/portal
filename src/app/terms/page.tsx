"use client";

import React from "react";
import MarketingNav from "@/components/marketing/MarketingNav";
import Footer from "../../components/Footer";
import { useLanguage } from "../../i18n/LanguageProvider";

export default function TermsPage() {
    const { language } = useLanguage();
    const isChinese = language === "zh";

    return (
        <div className="min-h-screen bg-background text-text transition-colors duration-150 flex flex-col">
            <MarketingNav />

            <main className="flex-1 relative overflow-hidden pt-24 pb-20">
                <div className="relative mx-auto max-w-4xl px-6">
                    <div className="mb-10 text-center">
                        <h1 className="text-3xl font-bold tracking-tight text-heading sm:text-4xl mb-4">
                            {isChinese ? "服务条款 (Terms of Service)" : "Terms of Service"}
                        </h1>
                        <p className="text-text-muted">
                            {isChinese ? "生效日期：2026年10月1日 | 最后更新：2026年10月1日" : "Effective Date: October 1, 2026 | Last Updated: October 1, 2026"}
                        </p>
                    </div>

                    <div className="prose dark:prose-invert max-w-none space-y-8 text-text-muted leading-relaxed">
                        {isChinese ? (
                            <>
                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">1. 接受条款 / Acceptance of Terms</h3>
                                    <p>通过访问或使用 XWork Technologies LLC（“公司”，“我们”）提供的服务、软件及平台，即表示您同意接受本条款的约束。如果您代表某个实体使用服务，您声明您拥有约束该实体的合法权限。</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">2. 服务的使用 / Use of Services</h3>
                                    <p>我们授予您有限的、非排他性的、不可转让的许可，以便根据本条款访问和使用 SVC+ Cloud-Neutral Platform、AI 原生工作区和开发者基础设施。服务仅限用于合法的商业或个人用途。</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">3. 用户责任 / User Responsibilities</h3>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>不得利用服务从事任何非法活动、侵犯他人权利或传输恶意代码。</li>
                                        <li>不得对我们的软件产品进行逆向工程、反编译或提取源代码。</li>
                                        <li>您应对您在使用我们服务期间上传、传输或处理的所有数据及内容负责。</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">4. 账户 / Accounts</h3>
                                    <p>您必须提供准确的注册信息并保证账户凭据的安全。如果发现任何未经授权使用您账户的情况，您同意立即通知我们。</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">5. 订阅与支付 / Subscription and Payments</h3>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong>费用：</strong> 使用特定的高级功能或平台服务可能需要按订阅制付费。</li>
                                        <li><strong>支付：</strong> 订阅通常会在计费周期结束时自动续订，除非您在续订日期前取消。</li>
                                        <li><strong>退款：</strong> 除非法律强制要求，否则已支付的费用通常不可退还。</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">6. 知识产权 / Intellectual Property</h3>
                                    <p>本服务中的所有专有技术、平台、商标和内容均属于 XWork Technologies LLC 或其许可方所有。本条款并未授予您对我们任何知识产权的所有权。</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">7. 服务可用性 / Service Availability</h3>
                                    <p>我们力求最大化服务的正常运行时间，但由于维护、更新或不受我们控制的问题（例如第三方云提供商或网络中断），服务可能会出现中断。</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">8. 责任限制 / Limitation of Liability</h3>
                                    <p>在法律允许的最大范围内，XWork Technologies LLC 对因使用或无法使用我们的服务而导致的任何间接的、附带的或特殊的损害（包括利润或数据的损失）概不负责。</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">9. 终止 / Termination</h3>
                                    <p>我们保留出于任何原因（包括违反本条款）在不提前通知的情况下随时暂停或终止您访问本服务的权利。账户终止后，您使用服务的许可将立即撤销。</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">10. 联系信息 / Contact Information</h3>
                                    <p>如有关于本服务条款的任何疑问，请联系我们：<a href="mailto:haitaopan@xworktech.com" className="text-primary hover:underline">haitaopan@xworktech.com</a></p>
                                </section>
                            </>
                        ) : (
                            <>
                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">1. Acceptance of Terms</h3>
                                    <p>By accessing or using the services, software, and platforms provided by XWork Technologies LLC (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;), you agree to be bound by these Terms of Service. If you are using the services on behalf of an entity, you represent that you have the legal authority to bind that entity to these terms.</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">2. Use of Services</h3>
                                    <p>We grant you a limited, non-exclusive, non-transferable license to access and use the SVC+ Cloud-Neutral Platform, AI-native workspaces, and developer infrastructure in accordance with these Terms. Services are intended for lawful business or personal use only.</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">3. User Responsibilities</h3>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li>You must not use the services for any illegal activities, to violate others&apos; rights, or to transmit malicious code.</li>
                                        <li>You must not reverse engineer, decompile, or extract the source code of our software products.</li>
                                        <li>You are responsible for all data and content you upload, transmit, or process using our services.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">4. Accounts</h3>
                                    <p>You must provide accurate registration information and keep your account credentials secure. You agree to notify us immediately of any unauthorized use of your account.</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">5. Subscription and Payments</h3>
                                    <ul className="list-disc pl-5 space-y-2">
                                        <li><strong>Fees:</strong> Access to certain premium features or platform services requires payment on a subscription basis.</li>
                                        <li><strong>Payment:</strong> Subscriptions typically renew automatically at the end of the billing cycle unless you cancel before the renewal date.</li>
                                        <li><strong>Refunds:</strong> Except as required by law, paid fees are generally non-refundable.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">6. Intellectual Property</h3>
                                    <p>All proprietary technology, platforms, trademarks, and content within the services are owned by XWork Technologies LLC or its licensors. These Terms do not grant you any ownership rights to our intellectual property.</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">7. Service Availability</h3>
                                    <p>We strive to maximize uptime, but services may be interrupted due to maintenance, updates, or issues outside our control (such as third-party cloud provider or network outages).</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">8. Limitation of Liability</h3>
                                    <p>To the maximum extent permitted by law, XWork Technologies LLC shall not be liable for any indirect, incidental, or special damages (including loss of profits or data) arising from the use of or inability to use our services.</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">9. Termination</h3>
                                    <p>We reserve the right to suspend or terminate your access to the services at any time, without notice, for any reason, including violation of these Terms. Upon termination, your license to use the services is immediately revoked.</p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-heading mb-3">10. Contact Information</h3>
                                    <p>If you have any questions about these Terms of Service, please contact us at: <a href="mailto:haitaopan@xworktech.com" className="text-primary hover:underline">haitaopan@xworktech.com</a></p>
                                </section>
                            </>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
