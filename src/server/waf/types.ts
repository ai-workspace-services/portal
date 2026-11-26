export type WafProviderType = "cloudflare" | "webhook";

export type WafActionMode = "observe" | "challenge" | "block";

export type CloudflarePlanTier = "free" | "pro" | "business" | "enterprise";

export type WafProviderCapabilities = {
  supportsObserveMode: boolean;
  supportsChallengeMode: boolean;
  supportsZoneDiscovery: boolean;
  supportsRemoteStatus: boolean;
  note?: string;
};

export type WafProviderConfig = {
  id: string;
  type: WafProviderType;
  name: string;
  enabled: boolean;
  builtIn?: boolean;
  domain?: string;
  zoneId?: string;
  planTier?: CloudflarePlanTier;
  endpointUrl?: string;
  credentialSource: "env" | "custom";
  hasSecret: boolean;
  capabilities: WafProviderCapabilities;
  updatedAt: string;
};

export type WafProviderRecord = WafProviderConfig & {
  customSecret?: string;
};

export type WafProviderUpsertInput = {
  id?: string;
  type: WafProviderType;
  name: string;
  enabled?: boolean;
  domain?: string;
  zoneId?: string;
  planTier?: CloudflarePlanTier;
  endpointUrl?: string;
  credentialSource?: "env" | "custom";
  secret?: string;
};

export type CrawlerPolicyInput = {
  providerId: string;
  domain: string;
  mode: WafActionMode;
  bots: string[];
  exceptions?: string[];
};

export type WafSyncResult = {
  ok: boolean;
  providerId: string;
  providerType: WafProviderType;
  domain: string;
  mode: WafActionMode;
  appliedAction: string;
  ruleId?: string;
  rulesetId?: string;
  expression?: string;
  message: string;
  syncedAt: string;
};

export type WafConnectionTestResult = {
  ok: boolean;
  providerId: string;
  message: string;
  zoneId?: string;
  zoneName?: string;
  planName?: string;
};

export type WafRemoteStatusResult = {
  ok: boolean;
  providerId: string;
  configured: boolean;
  ruleId?: string;
  action?: string;
  enabled?: boolean;
  expression?: string;
  lastUpdated?: string;
  message: string;
};
