"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import { getExtensionRegistry } from "@extensions/loader";
import { resolveAccess, type AccessRule } from "@lib/accessControl";
import { useUserStore } from "@lib/userStore";

const registry = getExtensionRegistry();

type RouteGuard = {
  path: string;
  match: "exact" | "startsWith";
  redirect?: {
    unauthenticated?: string;
    forbidden?: string;
  };
  rule: AccessRule;
};

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const user = useUserStore((state) => state.user);
  const isLoading = useUserStore((state) => state.isLoading);

  const routeGuards = useMemo<RouteGuard[]>(() => {
    return registry.routes
      .filter((route) => route.guard)
      .map((route) => ({
        path: route.path,
        match: route.match ?? "exact",
        redirect: route.redirect,
        rule: route.guard!,
      }))
      .sort((a, b) => b.path.length - a.path.length);
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const guard = routeGuards.find((entry) =>
      entry.match === "startsWith"
        ? pathname.startsWith(entry.path)
        : pathname === entry.path,
    );
    if (!guard) {
      return;
    }

    const decision = resolveAccess(user, guard.rule);
    if (!decision.allowed) {
      const redirect = guard.redirect ?? {};
      const destination =
        decision.reason === "unauthenticated"
          ? (redirect.unauthenticated ?? "/login")
          : (redirect.forbidden ?? redirect.unauthenticated ?? "/login");
      if (destination && destination !== pathname) {
        router.replace(destination);
      }
    }
  }, [isLoading, pathname, routeGuards, router, user]);

  return (
    <div className="relative flex min-h-screen bg-gradient-to-br from-[var(--gradient-app-from)] via-[var(--gradient-app-via)] to-[var(--gradient-app-to)] text-[var(--color-text)]">
      <Sidebar
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        onNavigate={() => setOpen(false)}
        collapsed={isCollapsed}
      />

      {open && (
        <div
          className="fixed inset-0 z-30 bg-[var(--color-overlay)] backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex min-h-screen flex-1 flex-col">
        <Header
          onMenu={() => setOpen((prev) => !prev)}
          onCollapse={() => setIsCollapsed((prev) => !prev)}
          isCollapsed={isCollapsed}
        />
        <main className="flex flex-1 flex-col space-y-3 bg-transparent px-2 py-3 text-[var(--color-text)] transition-colors sm:px-3 md:px-4 lg:px-5">
          <div className="flex w-full flex-1 flex-col gap-3 rounded-[6px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] p-3 text-[var(--color-text)] shadow-[var(--shadow-soft)] backdrop-blur md:gap-4 md:p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
