import type { IntegrationDefaults } from "@/lib/openclaw/types";

export type XWorkmateEdition = "shared_public" | "tenant_private";
export type XWorkmateProfileScope = "tenant-shared" | "user-private";
export type XWorkmateMembershipRole = "admin" | "user";

export type XWorkmateProfile = {
  openclawUrl: string;
  openclawOrigin: string;
  vaultUrl: string;
  vaultNamespace: string;
  vaultSecretPath: string;
  vaultSecretKey: string;
  apisixUrl: string;
  bridgeUrl?: string;
  bridgeToken?: string;
};

export type XWorkmateProfileResponse = {
  edition: XWorkmateEdition;
  tenant: {
    id: string;
    name: string;
    domain: string;
  };
  membershipRole: XWorkmateMembershipRole;
  profileScope: XWorkmateProfileScope;
  canEditIntegrations: boolean;
  canManageTenant: boolean;
  profile: XWorkmateProfile;
  tokenConfigured: {
    openclaw: boolean;
    vault: boolean;
    apisix: boolean;
  };
};

export function toXWorkmateIntegrationDefaults(
  payload: XWorkmateProfileResponse | null | undefined,
): IntegrationDefaults {
  return {
    openclawUrl: payload?.profile.openclawUrl ?? "",
    openclawOrigin: payload?.profile.openclawOrigin ?? "",
    openclawTokenConfigured: Boolean(payload?.tokenConfigured.openclaw),
    vaultUrl: payload?.profile.vaultUrl ?? "",
    vaultNamespace: payload?.profile.vaultNamespace ?? "",
    vaultTokenConfigured: Boolean(payload?.tokenConfigured.vault),
    vaultSecretPath: payload?.profile.vaultSecretPath ?? "",
    vaultSecretKey: payload?.profile.vaultSecretKey ?? "",
    apisixUrl: payload?.profile.apisixUrl ?? "",
    apisixTokenConfigured: Boolean(payload?.tokenConfigured.apisix),
  };
}

export function buildXWorkmateScopeKey(
  payload: XWorkmateProfileResponse | null | undefined,
  userId?: string | null,
  host?: string | null,
): string {
  const normalizedHost =
    String(host ?? "")
      .trim()
      .toLowerCase() || "shared";
  const normalizedTenant = payload?.tenant.id?.trim() || "anonymous";
  const normalizedScope = payload?.profileScope?.trim() || "guest";
  const normalizedUser =
    payload?.profileScope === "tenant-shared"
      ? "shared"
      : String(userId ?? "").trim() || "anonymous";

  return [
    "xworkmate",
    normalizedHost,
    normalizedTenant,
    normalizedUser,
    normalizedScope,
  ].join(":");
}
