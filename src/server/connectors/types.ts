export type ConnectorCategoryId =
  | "code"
  | "cloud"
  | "email"
  | "workspace"
  | "secrets"
  | "mcp";

export type ConnectorAuthKind =
  | "oidc"
  | "api-token"
  | "ak-sk"
  | "webhook-mcp"
  | "service-account";

export type ConnectorStatus = "connected" | "attention" | "available";

export type ConnectorAuthMode =
  | "oauth2"
  | "service-account"
  | "api-token"
  | "ak-sk"
  | "webhook-mcp"
  | "public-csv"
  | "env"
  | "none";

export type ConnectorDefinition = {
  id: string;
  name: string;
  description: string;
  category: ConnectorCategoryId;
  categoryLabel: string;
  authKinds: ConnectorAuthKind[];
  preferredAuth: ConnectorAuthKind;
  isCustom?: boolean;
};

export type ConnectorRecord = {
  id: string;
  status: ConnectorStatus;
  account?: string;
  authMode?: ConnectorAuthMode;
  endpoint?: string;
  clientId?: string;
  clientSecret?: string;
  token?: string;
  accessKey?: string;
  secretKey?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  serviceAccountJson?: string;
  spreadsheetUrl?: string;
  spreadsheetId?: string;
  gid?: string;
  sheetTitle?: string;
  lastChecked?: string;
  lastSyncedAt?: string;
  statusDetail?: string;
  updatedAt?: string;
  isCustom?: boolean;
  customMeta?: {
    name: string;
    description: string;
    category: ConnectorCategoryId;
    categoryLabel: string;
    authKinds: ConnectorAuthKind[];
    preferredAuth: ConnectorAuthKind;
  };
};

export type ConnectorRuntime = {
  id: string;
  status: ConnectorStatus;
  account?: string;
  authMode: ConnectorAuthMode;
  credentialConfigured: boolean;
  writable: boolean;
  oauthConfigured: boolean;
  endpoint?: string;
  spreadsheetUrl?: string;
  spreadsheetId?: string;
  gid?: string;
  sheetTitle?: string;
  lastChecked?: string;
  lastSyncedAt?: string;
  statusDetail?: string;
  isCustom?: boolean;
  customMeta?: ConnectorRecord["customMeta"];
};

export type ConnectorSanitizedConfigDocument = {
  ownerId: string;
  storePathConfigured: boolean;
  updatedAt: string;
  connectors: Array<{
    id: string;
    status: ConnectorStatus;
    authMode: ConnectorAuthMode;
    credentialConfigured: boolean;
    oauthConfigured: boolean;
    writable: boolean;
    account?: string;
    endpoint?: string;
    spreadsheetUrl?: string;
    spreadsheetId?: string;
    gid?: string;
    sheetTitle?: string;
    lastChecked?: string;
    lastSyncedAt?: string;
    isCustom?: boolean;
  }>;
};
