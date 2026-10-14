import { describe, expect, it } from "vitest";
import { createSnapshotPlan } from "./snapshot-plan";

describe("snapshot plans", () => {
  it("keeps preview non-writing and stops before deployment", () => {
    const p = createSnapshotPlan({ environment: "uat", mode: "preview" });
    expect(p.inputs?.enable_migration).toBe(true);
    expect(p.inputs?.adopt_accounts_baseline).toBe(false);
    expect(JSON.parse(p.inputs!.migration_config_json).dry_run).toBe(true);
    expect(p.steps).not.toContain("deploy");
    expect(p.executable).toBe(false);
  });
  it("does not dispatch production through Daily", () => {
    const p = createSnapshotPlan({ environment: "prod", mode: "none" });
    expect(p.workflow).toBeNull();
    expect(p.inputs).toBeNull();
    expect(p.blocker).toBe("protected_release_not_connected");
  });
  it("rejects attempts to override mode flags", () => {
    expect(() =>
      createSnapshotPlan({ inputs: { enable_migration: true } }),
    ).toThrow("unsupported_input");
  });
  it("requires explicit write configuration and confines data operations to UAT", () => {
    expect(() => createSnapshotPlan({ mode: "import" })).toThrow(
      "write_requires_explicit_dry_run_false",
    );
    expect(() =>
      createSnapshotPlan({ environment: "sit", mode: "preview" }),
    ).toThrow("data_operation_uat_only");
    expect(() =>
      createSnapshotPlan({
        mode: "preview",
        inputs: { migration_config_json: '{"dry_run":false}' },
      }),
    ).toThrow("preview_cannot_write");
  });
  it("rejects arbitrary probes, secrets and destructive configs", () => {
    expect(() =>
      createSnapshotPlan({
        inputs: { shared_vault_endpoint: "https://localhost/" },
      }),
    ).toThrow("unsupported_probe_endpoint");
    expect(() =>
      createSnapshotPlan({
        mode: "preview",
        inputs: { migration_config_json: '{"dsn":"secret"}' },
      }),
    ).toThrow("unsafe_import_config");
    expect(() =>
      createSnapshotPlan({
        mode: "preview",
        inputs: {
          migration_config_json:
            '{"supabase_target_existing_strategy":"replace_public"}',
        },
      }),
    ).toThrow("destructive_import_disabled");
  });
  it("requires a full snapshot for imports and schema operations", () => {
    expect(() =>
      createSnapshotPlan({
        mode: "preview",
        inputs: { repositories: "ai-workspace-services/accounts" },
      }),
    ).toThrow("import_requires_full_snapshot");
    expect(() =>
      createSnapshotPlan({
        mode: "schema",
        inputs: { snapshot_source_ref: "main" },
      }),
    ).toThrow("requires_full_main_snapshot");
  });
});
