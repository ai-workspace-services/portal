"use client";

import Link from "next/link";

import { LockKeyhole } from "lucide-react";

import { useUserStore } from "@lib/userStore";

export function usePaymentMfaRequired(): boolean {
  const user = useUserStore((state) => state.user);
  return Boolean(
    user && !user.isReadOnly && (!user.mfaEnabled || user.mfaPending),
  );
}

export default function PaymentMfaNotice() {
  const requiresMfa = usePaymentMfaRequired();

  if (!requiresMfa) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-xl border border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/55 p-4 text-sm text-[var(--color-warning-foreground)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex gap-3">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">绑定 MFA 后即可安全支付</p>
          <p className="mt-1 text-xs leading-5">
            浏览和管理用户中心不受影响；发起 Stripe
            购买、订阅或账单管理前需要完成身份验证。
          </p>
        </div>
      </div>
      <Link
        href="/panel/account?setupMfa=1"
        className="tactile-button tactile-button-primary shrink-0 px-3 text-sm"
      >
        去绑定 MFA
      </Link>
    </div>
  );
}
