export type SnapshotEnvironment = "sit" | "uat" | "prod";
export type DataMode = "none" | "preview" | "import" | "baseline" | "schema";
export const SNAPSHOT_WORKFLOW = "daily-main-snapshot.yaml";
export const snapshotCatalog = {
  schemaVersion: 1 as const,
  workflow: SNAPSHOT_WORKFLOW,
  environments: ["sit", "uat", "prod"],
  executionAvailable: false,
  mcp: "/api/operations/mcp",
  inputs: {
    snapshot_tag: "",
    snapshot_source_ref: "",
    deploy_env: "uat",
    repositories: "",
    skip_stripe_catalog: false,
    xconnect_one_release_tag: "",
    xconnect_gateway_release_tag: "",
    enable_migration: false,
    migration_config_json: "{}",
    adopt_accounts_baseline: false,
    apply_accounts_schema_migration: false,
    accounts_schema_expected_version: "",
    accounts_schema_target_version: "",
    accounts_schema_sha256: "",
    shared_vault_endpoint: "https://vault.svc.plus",
    shared_observability_endpoint: "https://observability.svc.plus",
    shared_iam_endpoint: "https://iam.svc.plus",
    shared_iam_issuer: "https://iam.svc.plus",
    shared_readiness_timeout_seconds: "20",
  },
};
const IMPORT_FIELDS = new Set([
  "confirm_legacy_import",
  "dry_run",
  "environment",
  "vault_env_path",
  "target_environment",
  "migration_scope",
  "toolkit_action",
  "caller_run_id",
  "accounts_transport",
  "accounts_source_backend",
  "accounts_target_backend",
  "accounts_migration_mode",
  "accounts_source_host",
  "accounts_target_host",
  "accounts_email_filter",
  "supabase_target_connection_mode",
  "supabase_target_existing_strategy",
  "supabase_target_confirm_replace",
  "supabase_metadata_dry_run",
  "supabase_project_ref",
  "supabase_vault_path",
  "supabase_source_vault_path",
  "supabase_target_dsn_key",
  "supabase_source_tunnel_host",
]);
export function createSnapshotPlan(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("invalid_request");
  const request = value as Record<string, unknown>;
  if (
    Object.keys(request).some(
      (k) => !["environment", "mode", "inputs"].includes(k),
    )
  )
    throw new Error("unsupported_field");
  const environment = request.environment ?? "uat";
  const mode = request.mode ?? "none";
  if (
    !["sit", "uat", "prod"].includes(String(environment)) ||
    !["none", "preview", "import", "baseline", "schema"].includes(String(mode))
  )
    throw new Error("invalid_mode");
  if (environment !== "uat" && mode !== "none")
    throw new Error("data_operation_uat_only");
  const raw = request.inputs ?? {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new Error("invalid_inputs");
  const inputs = { ...snapshotCatalog.inputs };
  const controlled = [
    "deploy_env",
    "enable_migration",
    "adopt_accounts_baseline",
    "apply_accounts_schema_migration",
  ];
  for (const [key, item] of Object.entries(raw)) {
    if (!(key in inputs) || controlled.includes(key))
      throw new Error("unsupported_input");
    if (typeof item !== typeof inputs[key as keyof typeof inputs])
      throw new Error("invalid_input_type");
    if (
      typeof item === "string" &&
      (item.length > 8192 || /[\x00-\x1f]/.test(item))
    )
      throw new Error("invalid_input_value");
    Object.assign(inputs, { [key]: item });
  }
  if (
    inputs.snapshot_tag &&
    !/^(?:uat-)?daily-build-\d{4}\.\d{2}\.\d{2}(?:-r[1-9]\d*)?$/.test(
      inputs.snapshot_tag,
    )
  )
    throw new Error("invalid_snapshot_tag");
  if (
    inputs.snapshot_source_ref &&
    !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(inputs.snapshot_source_ref)
  )
    throw new Error("invalid_source_ref");
  if (
    inputs.repositories &&
    !inputs.repositories
      .split(",")
      .every((r) =>
        /^ai-workspace-(infra|lab|services|xstream)\/[A-Za-z0-9._-]+$/.test(
          r.trim(),
        ),
      )
  )
    throw new Error("invalid_repositories");
  for (const field of [
    "xconnect_one_release_tag",
    "xconnect_gateway_release_tag",
  ] as const) {
    if (inputs[field] && !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(inputs[field]))
      throw new Error("invalid_release_tag");
  }
  if (
    !/^[1-9]\d*$/.test(inputs.shared_readiness_timeout_seconds) ||
    Number(inputs.shared_readiness_timeout_seconds) > 120
  )
    throw new Error("invalid_timeout");
  for (const field of [
    "shared_vault_endpoint",
    "shared_observability_endpoint",
    "shared_iam_endpoint",
    "shared_iam_issuer",
  ] as const) {
    const url = new URL(inputs[field]);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !["vault.svc.plus", "observability.svc.plus", "iam.svc.plus"].includes(
        url.hostname,
      ) ||
      url.port
    )
      throw new Error("unsupported_probe_endpoint");
  }
  if (
    (mode === "baseline" || mode === "schema") &&
    (inputs.repositories || inputs.snapshot_source_ref)
  )
    throw new Error("requires_full_main_snapshot");
  if (["preview", "import"].includes(String(mode)) && inputs.repositories)
    throw new Error("import_requires_full_snapshot");
  let config: Record<string, unknown>;
  try {
    config = JSON.parse(inputs.migration_config_json);
  } catch {
    throw new Error("invalid_import_json");
  }
  if (!config || typeof config !== "object" || Array.isArray(config))
    throw new Error("invalid_import_json");
  for (const [key, item] of Object.entries(config)) {
    if (
      !IMPORT_FIELDS.has(key) ||
      !["string", "boolean", "number"].includes(typeof item) ||
      (typeof item === "string" &&
        /postgres(?:ql)?:\/\/|PRIVATE KEY|bearer\s/i.test(item))
    )
      throw new Error("unsafe_import_config");
  }
  if (
    config.supabase_target_existing_strategy === "replace_public" ||
    config.supabase_target_confirm_replace === true
  )
    throw new Error("destructive_import_disabled");
  if (config.confirm_legacy_import === false)
    throw new Error("import_confirmation_rejected");
  if (mode === "none" && Object.keys(config).length)
    throw new Error("unused_import_config");
  if (
    mode !== "schema" &&
    (inputs.accounts_schema_expected_version ||
      inputs.accounts_schema_target_version ||
      inputs.accounts_schema_sha256)
  )
    throw new Error("unused_schema_parameters");
  if (
    mode === "schema" &&
    (!/^\d+$/.test(inputs.accounts_schema_expected_version) ||
      !/^\d+$/.test(inputs.accounts_schema_target_version) ||
      Number(inputs.accounts_schema_target_version) <=
        Number(inputs.accounts_schema_expected_version) ||
      !/^[a-f0-9]{64}$/.test(inputs.accounts_schema_sha256))
  )
    throw new Error("invalid_schema_contract");
  if (mode === "preview" && config.dry_run === false)
    throw new Error("preview_cannot_write");
  if (mode === "import" && config.dry_run !== false)
    throw new Error("write_requires_explicit_dry_run_false");
  inputs.deploy_env = String(environment);
  inputs.enable_migration = mode === "preview" || mode === "import";
  inputs.adopt_accounts_baseline = mode === "baseline";
  inputs.apply_accounts_schema_migration = mode === "schema";
  if (inputs.enable_migration)
    inputs.migration_config_json = JSON.stringify({
      ...config,
      confirm_legacy_import: true,
      dry_run: mode === "preview",
      accounts_transport: config.accounts_transport ?? "direct",
    });
  const steps =
    environment === "prod"
      ? ["protected_release"]
      : [
          "validate",
          "snapshot",
          "build",
          ...(inputs.repositories
            ? []
            : [
                "shared",
                ...(mode !== "none" ? [String(mode)] : []),
                ...(mode !== "preview" && environment === "uat"
                  ? ["deploy"]
                  : []),
              ]),
        ];
  return {
    schemaVersion: 1 as const,
    environment,
    mode,
    workflow: environment === "prod" ? null : SNAPSHOT_WORKFLOW,
    inputs: environment === "prod" ? null : inputs,
    steps,
    previewOnly: mode === "preview",
    executable: false as const,
    blocker:
      environment === "prod"
        ? "protected_release_not_connected"
        : "execution_backend_not_connected",
  };
}
