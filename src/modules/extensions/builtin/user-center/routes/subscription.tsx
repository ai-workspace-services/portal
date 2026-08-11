"use client";

import Breadcrumbs from "@/app/panel/components/Breadcrumbs";
import Card from "../components/Card";
import BillingOptionsPanel from "../account/BillingOptionsPanel";
import SubscriptionPanel from "../account/SubscriptionPanel";
import PaymentMfaNotice from "@components/billing/PaymentMfaNotice";
import { useUserStore } from "@lib/userStore";

export default function UserCenterSubscriptionRoute() {
  const user = useUserStore((state) => state.user);
  const isReadOnlyRole = Boolean(user?.isReadOnly);

  if (isReadOnlyRole) {
    return (
      <div className="space-y-4">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/panel" },
            { label: "Subscription", href: "/panel/subscription" },
          ]}
        />
        <Card>
          <h1 className="text-2xl font-semibold text-gray-900">支付与订阅</h1>
          <p className="mt-2 text-sm text-gray-600">
            Demo
            体验账号为只读模式，无需订阅或付费。你可以继续浏览控制台并体验核心功能。
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/panel" },
          { label: "Subscription", href: "/panel/subscription" },
        ]}
      />
      <Card>
        <h1 className="text-2xl font-semibold text-gray-900">支付与订阅</h1>
        <p className="mt-2 text-sm text-gray-600">
          所有套餐统一通过 Stripe
          结算，购买后会自动同步到订阅记录，并可在客户门户管理账单。
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-[color:var(--color-surface-muted)] p-3 text-sm text-gray-700 shadow-sm">
            <p className="font-semibold text-[color:var(--color-heading)]">
              步骤 1：选择产品模式
            </p>
            <p className="text-gray-600">
              按量购买或订阅购买都会映射到统一的 Stripe 价格配置。
            </p>
          </div>
          <div className="rounded-xl bg-[color:var(--color-surface-muted)] p-3 text-sm text-gray-700 shadow-sm">
            <p className="font-semibold text-[color:var(--color-heading)]">
              步骤 2：跳转 Stripe
            </p>
            <p className="text-gray-600">
              登录后直接进入 Stripe Checkout，避免本地保存任何敏感支付方式入口。
            </p>
          </div>
          <div className="rounded-xl bg-[color:var(--color-surface-muted)] p-3 text-sm text-gray-700 shadow-sm">
            <p className="font-semibold text-[color:var(--color-heading)]">
              步骤 3：自动识别到账
            </p>
            <p className="text-gray-600">
              Stripe 回调与 webhook 会自动更新订阅状态，无需手工同步。
            </p>
          </div>
        </div>
      </Card>
      <PaymentMfaNotice />
      <BillingOptionsPanel />
      <SubscriptionPanel showPaymentMfaNotice={false} />
    </div>
  );
}
