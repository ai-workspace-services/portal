export const dynamic = "force-dynamic";

import { Suspense } from "react";

import AccountRecoveryContent from "./AccountRecoveryContent";

function AccountRecoveryPageFallback() {
  return <div className="flex min-h-screen flex-col bg-background" />;
}

export default function AccountRecoveryPage() {
  return (
    <Suspense fallback={<AccountRecoveryPageFallback />}>
      <AccountRecoveryContent />
    </Suspense>
  );
}
