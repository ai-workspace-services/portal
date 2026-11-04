"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { XWorkmateLoading } from "@/app/xworkmate/XWorkmateLoading";
import { useUserStore } from "@/lib/userStore";
import {
  buildSharedXWorkmateUrl,
  isLegacyConsoleXWorkmateHost,
  isSharedXWorkmateHost,
  normalizeXWorkmateHost,
} from "@/lib/xworkmate/host";
import {
  buildXWorkmateScopeKey,
  type XWorkmateProfileResponse,
} from "@/lib/xworkmate/types";
import { XWorkmateProfileEditor } from "@/components/xworkmate/XWorkmateProfileEditor";

type ProfileRouteMode = "admin" | "integrations";

type XWorkmateProfileRouteProps = {
  mode: ProfileRouteMode;
};

async function fetchProfile(): Promise<XWorkmateProfileResponse | null> {
  const response = await fetch("/api/xworkmate/profile", {
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`xworkmate_profile_failed:${response.status}`);
  }

  return (await response.json()) as XWorkmateProfileResponse;
}

export function XWorkmateProfileRoute({
  mode,
}: XWorkmateProfileRouteProps): React.ReactNode {
  const router = useRouter();
  const sessionUser = useUserStore((state) => state.user);
  const [profile, setProfile] = useState<XWorkmateProfileResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "redirecting">(
    "loading",
  );

  const requestHost = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return normalizeXWorkmateHost(window.location.host);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (isLegacyConsoleXWorkmateHost(requestHost)) {
          setStatus("redirecting");
          window.location.replace(
            buildSharedXWorkmateUrl(
              mode === "admin" ? "/xworkmate/admin" : "/xworkmate/integrations",
            ),
          );
          return;
        }

        const nextProfile = await fetchProfile();
        if (cancelled) {
          return;
        }

        if (!nextProfile) {
          setStatus("redirecting");
          router.replace("/xworkmate");
          return;
        }

        if (mode === "admin") {
          if (!isSharedXWorkmateHost(requestHost)) {
            setStatus("redirecting");
            router.replace("/xworkmate/integrations");
            return;
          }

          if (
            nextProfile.profileScope !== "tenant-shared" ||
            !nextProfile.canEditIntegrations
          ) {
            setStatus("redirecting");
            router.replace("/xworkmate");
            return;
          }
        } else {
          if (isSharedXWorkmateHost(requestHost)) {
            setStatus("redirecting");
            router.replace(
              nextProfile.canEditIntegrations
                ? "/xworkmate/admin"
                : "/xworkmate",
            );
            return;
          }

          if (nextProfile.profileScope !== "user-private") {
            setStatus("redirecting");
            router.replace("/xworkmate");
            return;
          }
        }

        setProfile(nextProfile);
        setStatus("ready");
      } catch {
        if (cancelled) {
          return;
        }
        setStatus("redirecting");
        router.replace("/xworkmate");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mode, requestHost, router]);

  if (status !== "ready" || !profile) {
    return <XWorkmateLoading />;
  }

  const scopeKey = buildXWorkmateScopeKey(
    profile,
    sessionUser?.id ?? sessionUser?.uuid ?? null,
    requestHost,
  );

  return (
    <div className="min-h-[calc(100vh-var(--app-shell-nav-offset))] bg-[linear-gradient(180deg,#f4f7fd_0%,#f6f8fb_32%,#f3f5f8_100%)] px-4 py-5 md:px-6 dark:bg-[linear-gradient(180deg,var(--gradient-app-from)_0%,var(--gradient-app-via)_32%,var(--gradient-app-to)_100%)]">
      <div className="mx-auto max-w-6xl">
        <XWorkmateProfileEditor
          payload={profile}
          scopeKey={scopeKey}
          workspaceHref="/xworkmate"
        />
      </div>
    </div>
  );
}
