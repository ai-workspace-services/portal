// Served from the auth SSR boundary, which is a separate build from the
// public one that links here. A statically prerendered page is the one case
// where the router accepts the foreign build's payload and the navigation
// never commits -- the link simply does nothing. Rendering per request keeps
// this page on the same full-page-load path as every other cross-boundary
// route, and an auth screen should not be cached for a year anyway.
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { isFeatureEnabled } from "@lib/featureToggles";
import { getAccountServiceBaseUrl } from "@server/serviceConfig";
import { LoginForm } from "./LoginForm";
import LoginContent from "./LoginContent";

function LoginPageFallback() {
  return <div className="flex min-h-screen flex-col bg-background" />;
}

export default function LoginPage() {
  if (!isFeatureEnabled("globalNavigation", "/login")) {
    notFound();
  }
  const accountServiceBaseUrl = getAccountServiceBaseUrl();
  // 统一返回：容器包裹表单，兼容两边改动
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginContent accountServiceBaseUrl={accountServiceBaseUrl}>
        <LoginForm />
      </LoginContent>
    </Suspense>
  );
}
