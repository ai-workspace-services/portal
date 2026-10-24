"use client";

import Link from "next/link";

import { LockKeyhole } from "lucide-react";

import { useUserStore } from "@lib/userStore";
import { useLanguage } from "@i18n/LanguageProvider";
import { accountSecurityCopy } from "@/lib/account-security";

export function useMfaMissing(): boolean {
  const user = useUserStore((state) => state.user);
  return Boolean(
    user && !user.isReadOnly && (!user.mfaEnabled || user.mfaPending),
  );
}

export default function PaymentMfaNotice() {
  const requiresMfa = useMfaMissing();
  const { language } = useLanguage();
  const copy = accountSecurityCopy(language);

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
          <p className="font-semibold">{copy.paymentTitle}</p>
          <p className="mt-1 text-xs leading-5">{copy.paymentRisk}</p>
        </div>
      </div>
      <Link
        href="/panel/account?setupMfa=1"
        className="tactile-button tactile-button-primary shrink-0 px-3 text-sm"
      >
        {copy.bindMfa}
      </Link>
    </div>
  );
}
