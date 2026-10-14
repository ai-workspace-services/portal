"use client";

import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  AlertTriangle,
  ArrowRight,
  Braces,
  ChevronDown,
  Clock3,
  Database,
  FileText,
  GitBranch,
  Info,
  ListOrdered,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import Breadcrumbs from "@/app/panel/components/Breadcrumbs";
import operationsContent from "@/data/content/operations";
import { createSnapshotPlan, snapshotCatalog } from "../lib/snapshot-plan";
import type { DataMode, SnapshotEnvironment } from "../lib/snapshot-plan";
import { isReleaseCatalog, RELEASE_LABELS } from "../lib/release-status";
import type { ReleaseCatalog } from "../lib/release-status";

const ui: Record<string, string> = operationsContent.zh.ui;
const PANEL =
  "min-w-0 rounded-xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-4 sm:p-6";
const INPUT =
  "mt-2 w-full min-w-0 rounded-md border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none focus:border-[color:var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary-muted)] disabled:opacity-60";
const NOTICE =
  "flex items-start gap-2 rounded-md border border-[color:var(--color-primary-border)] bg-[var(--color-primary-muted)] p-3 text-xs leading-relaxed text-[var(--color-primary)]";
type Inputs = typeof snapshotCatalog.inputs;
type InputKey = keyof Inputs;
type Plan = ReturnType<typeof createSnapshotPlan>;
type FieldKey = InputKey | "mode" | "environment" | "form";
interface ValidationFailure {
  field: FieldKey;
  code: string;
}

const MODES = [
  { value: "preview", Icon: Search },
  { value: "import", Icon: Database },
  { value: "baseline", Icon: FileText },
  { value: "schema", Icon: Wrench },
  { value: "none", Icon: ShieldCheck },
] as const;
const ADVANCED_FIELDS = [
  ["xconnect_one_release_tag", "oneTag"],
  ["xconnect_gateway_release_tag", "gatewayTag"],
  ["shared_vault_endpoint", "vaultEndpoint"],
  ["shared_observability_endpoint", "observabilityEndpoint"],
  ["shared_iam_endpoint", "iamEndpoint"],
  ["shared_iam_issuer", "iamIssuer"],
  ["shared_readiness_timeout_seconds", "timeout"],
] as const;
const CONTROLLED = new Set<InputKey>([
  "deploy_env",
  "enable_migration",
  "adopt_accounts_baseline",
  "apply_accounts_schema_migration",
]);
const ERROR_FIELDS: Record<string, FieldKey> = {
  invalid_snapshot_tag: "snapshot_tag",
  invalid_source_ref: "snapshot_source_ref",
  invalid_repositories: "repositories",
  invalid_timeout: "shared_readiness_timeout_seconds",
  invalid_import_json: "migration_config_json",
  unsafe_import_config: "migration_config_json",
  destructive_import_disabled: "migration_config_json",
  import_confirmation_rejected: "migration_config_json",
  preview_cannot_write: "migration_config_json",
  write_requires_explicit_dry_run_false: "migration_config_json",
  unused_import_config: "migration_config_json",
  invalid_schema_contract: "accounts_schema_target_version",
  requires_full_main_snapshot: "repositories",
  import_requires_full_snapshot: "repositories",
  data_operation_uat_only: "mode",
};

async function fetchReleases(url: string): Promise<ReleaseCatalog> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok)
    throw new Error(`${ui.releaseUnavailable} (HTTP ${response.status})`);
  const payload: unknown = await response.json();
  if (!isReleaseCatalog(payload)) throw new Error(ui.releaseUnavailable);
  return payload;
}

function Field({
  name,
  label,
  help,
  failure,
  children,
}: {
  name: string;
  label: string;
  help?: string;
  failure: ValidationFailure | null;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={name}
        className="block text-xs font-semibold text-[var(--color-heading)]"
      >
        {label}
      </label>
      {children}
      {help && (
        <p
          id={`${name}-help`}
          className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-muted)]"
        >
          {help}
        </p>
      )}
      {failure?.field === name && (
        <p
          id={`${name}-error`}
          role="alert"
          className="mt-2 text-xs text-[var(--color-danger)]"
        >
          {ui.validationError} <code>{failure.code}</code>
        </p>
      )}
    </div>
  );
}

export default function SnapshotOperationsPage(): ReactNode {
  const [environment, setEnvironment] = useState<SnapshotEnvironment>("uat");
  const [mode, setMode] = useState<DataMode>("preview");
  const [inputs, setInputs] = useState<Inputs>({ ...snapshotCatalog.inputs });
  const [selectedRepositories, setSelectedRepositories] = useState(false);
  const [showParameters, setShowParameters] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [failure, setFailure] = useState<ValidationFailure | null>(null);
  const { data, error, isLoading, mutate } = useSWR(
    "/api/operations/releases",
    fetchReleases,
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    },
  );

  const request = {
    environment,
    mode,
    inputs: Object.fromEntries(
      Object.entries(inputs).filter(
        ([key]) => !CONTROLLED.has(key as InputKey),
      ),
    ),
  };
  let currentPlan: Plan | null = null;
  let currentFailure: ValidationFailure | null = null;
  try {
    if (selectedRepositories && !inputs.repositories.trim()) {
      throw new Error("invalid_repositories");
    }
    // The JSON editor permits indentation; workflow inputs require a single line.
    request.inputs.migration_config_json = JSON.stringify(
      JSON.parse(inputs.migration_config_json),
    );
    currentPlan = createSnapshotPlan(request);
  } catch (cause) {
    const code =
      cause instanceof SyntaxError
        ? "invalid_import_json"
        : cause instanceof Error
          ? cause.message
          : "invalid_plan_input";
    let field = ERROR_FIELDS[code] ?? "form";
    if (code === "invalid_release_tag") {
      field =
        !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(
          inputs.xconnect_one_release_tag,
        ) && inputs.xconnect_one_release_tag
          ? "xconnect_one_release_tag"
          : "xconnect_gateway_release_tag";
    }
    if (code === "unsupported_probe_endpoint" || code === "Invalid URL") {
      field = "shared_vault_endpoint";
      for (const key of [
        "shared_vault_endpoint",
        "shared_observability_endpoint",
        "shared_iam_endpoint",
        "shared_iam_issuer",
      ] as const) {
        try {
          const url = new URL(inputs[key]);
          if (
            url.protocol !== "https:" ||
            url.username ||
            url.password ||
            url.search ||
            url.hash ||
            url.port ||
            ![
              "vault.svc.plus",
              "observability.svc.plus",
              "iam.svc.plus",
            ].includes(url.hostname)
          ) {
            field = key;
            break;
          }
        } catch {
          field = key;
          break;
        }
      }
    }
    currentFailure = { field, code };
  }
  const visibleFailure = failure ?? currentFailure;
  const stages = currentPlan?.steps ?? [];
  const recent =
    data?.releases
      .filter((release) => release.environment === environment)
      .slice()
      .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .slice(0, 3) ?? [];

  function clearResult(): void {
    setPlan(null);
    setFailure(null);
  }
  function updateInput<K extends InputKey>(key: K, value: Inputs[K]): void {
    clearResult();
    setInputs((previous) => ({ ...previous, [key]: value }));
  }
  function changeMode(next: DataMode): void {
    clearResult();
    setMode(next);
    setInputs((previous) => ({
      ...previous,
      migration_config_json: next === "import" ? '{"dry_run":false}' : "{}",
      accounts_schema_expected_version: "",
      accounts_schema_target_version: "",
      accounts_schema_sha256: "",
    }));
  }
  function changeEnvironment(next: SnapshotEnvironment): void {
    clearResult();
    setEnvironment(next);
    if (next !== "uat") changeMode("none");
  }
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (planning) return;
    setPlan(null);
    if (currentFailure || !currentPlan) {
      setFailure(currentFailure);
      return;
    }
    if (environment === "prod") return;
    setPlanning(true);
    setFailure(null);
    try {
      const response = await fetch("/api/operations/plans", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        setFailure({ field: "form", code: `HTTP ${response.status}` });
        return;
      }
      const payload: unknown = await response.json();
      // A successful HTTP response alone does not establish that a valid plan was returned.
      if (JSON.stringify(payload) !== JSON.stringify(currentPlan)) {
        setFailure({ field: "form", code: "invalid_plan_response" });
        return;
      }
      setPlan(payload as Plan);
      setShowParameters(true);
    } catch {
      setFailure({ field: "form", code: "plan_api_unavailable" });
    } finally {
      setPlanning(false);
    }
  }
  function textField(
    key: InputKey,
    label: string,
    help?: string,
    type = "text",
  ): ReactNode {
    const hasError = visibleFailure?.field === key;
    return (
      <Field
        key={key}
        name={key}
        label={label}
        help={help}
        failure={visibleFailure}
      >
        <input
          id={key}
          name={key}
          type={type}
          value={String(inputs[key])}
          onChange={(event) =>
            updateInput(key, event.target.value as Inputs[typeof key])
          }
          className={INPUT}
          aria-invalid={hasError || undefined}
          aria-describedby={
            hasError ? `${key}-error` : help ? `${key}-help` : undefined
          }
          autoComplete="off"
          spellCheck={false}
        />
      </Field>
    );
  }

  return (
    <div className="min-w-0 space-y-5 text-[var(--color-text)]">
      <Breadcrumbs
        items={[
          { label: "Platform Operations", href: "/panel/operations" },
          { label: ui.releases, href: "/panel/operations/releases" },
          { label: ui.title, href: "/panel/operations" },
        ]}
      />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-heading)]">
            {ui.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {ui.subtitle}
          </p>
        </div>
        <a
          href="#operations-mcp"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-muted)] px-3 py-2 text-xs font-semibold text-[var(--color-primary)]"
        >
          <Sparkles className="h-4 w-4" />
          {ui.mcp}
        </a>
      </header>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(19rem,1fr)]">
        <form
          onSubmit={submit}
          noValidate
          className={PANEL}
          aria-busy={planning}
        >
          <fieldset disabled={planning} className="min-w-0 space-y-6">
            <section aria-labelledby="environment-title">
              <h2
                id="environment-title"
                className="text-sm font-semibold text-[var(--color-heading)]"
              >
                1. {ui.environment}
              </h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                {ui.environmentHelp}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {(["sit", "uat", "prod"] as const).map((value) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${environment === value ? "border-[color:var(--color-primary)] bg-[var(--color-primary-muted)]" : "border-[color:var(--color-surface-border)] hover:bg-[var(--color-surface-hover)]"}`}
                  >
                    <input
                      type="radio"
                      name="environment"
                      value={value}
                      checked={environment === value}
                      onChange={() => changeEnvironment(value)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
                    />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {value === "prod" && (
                          <ShieldCheck className="h-4 w-4" />
                        )}
                        {value.toUpperCase()}
                        {value === "prod" && (
                          <span className="rounded-full bg-[var(--color-warning-muted)] px-2 py-0.5 text-xs text-[var(--color-warning-foreground)]">
                            {ui.protectedRelease}
                          </span>
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-[var(--color-text-muted)]">
                        {ui[`${value}Description`]}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                {ui.prodHelp}
              </p>
            </section>
            <fieldset
              disabled={environment === "prod"}
              className="min-w-0 space-y-6"
            >
              <section aria-labelledby="source-title">
                <h2
                  id="source-title"
                  className="text-sm font-semibold text-[var(--color-heading)]"
                >
                  2. {ui.source}
                </h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field
                    name="snapshot-source"
                    label={ui.source}
                    failure={null}
                  >
                    <div className={`${INPUT} flex items-center gap-2`}>
                      <GitBranch className="h-4 w-4" />
                      <output id="snapshot-source">GitHub (github.com)</output>
                    </div>
                  </Field>
                  {textField("snapshot_source_ref", ui.sourceRef, "main")}
                </div>
              </section>
              <section aria-labelledby="tag-title">
                <h2
                  id="tag-title"
                  className="text-sm font-semibold text-[var(--color-heading)]"
                >
                  3. {ui.tag}
                </h2>
                <div className="mt-3">
                  {textField("snapshot_tag", ui.tag, ui.autoTag)}
                </div>
              </section>
              <section aria-labelledby="repositories-title">
                <h2
                  id="repositories-title"
                  className="text-sm font-semibold text-[var(--color-heading)]"
                >
                  4. {ui.repositories}
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[false, true].map((selected) => (
                    <label
                      key={String(selected)}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${selectedRepositories === selected ? "border-[color:var(--color-primary)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]" : "border-[color:var(--color-surface-border)]"}`}
                    >
                      <input
                        type="radio"
                        name="repository-scope"
                        checked={selectedRepositories === selected}
                        onChange={() => {
                          clearResult();
                          setSelectedRepositories(selected);
                          if (!selected) updateInput("repositories", "");
                        }}
                        className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
                      />
                      <span className="font-medium">
                        {selected
                          ? ui.selectedRepositories
                          : ui.allRepositories}
                      </span>
                    </label>
                  ))}
                </div>
                {selectedRepositories && (
                  <div className="mt-3">
                    {textField(
                      "repositories",
                      ui.selectedRepositories,
                      ui.repositoryHelp,
                    )}
                    {!inputs.repositories.trim() && (
                      <p className="mt-2 text-xs text-[var(--color-danger)]">
                        {ui.validationError}
                      </p>
                    )}
                  </div>
                )}
              </section>
              <section aria-labelledby="mode-title">
                <h2
                  id="mode-title"
                  className="text-sm font-semibold text-[var(--color-heading)]"
                >
                  5. {ui.dataMode}
                </h2>
                <div className="mt-3 grid gap-1 rounded-md border border-[color:var(--color-surface-border)] p-1 sm:grid-cols-3 2xl:grid-cols-5">
                  {MODES.map(({ value, Icon }) => (
                    <label
                      key={value}
                      className={`flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded px-2 py-2 text-xs font-medium has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 ${mode === value ? "bg-[var(--color-primary-muted)] text-[var(--color-primary)]" : "hover:bg-[var(--color-surface-hover)]"}`}
                    >
                      <input
                        type="radio"
                        name="data-mode"
                        value={value}
                        checked={mode === value}
                        disabled={environment !== "uat" && value !== "none"}
                        onChange={() => changeMode(value)}
                        className="sr-only peer"
                      />
                      <Icon className="h-4 w-4 shrink-0 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2" />
                      <span>{ui[value]}</span>
                    </label>
                  ))}
                </div>
                {mode === "preview" && (
                  <p className={`${NOTICE} mt-2`}>
                    <Info className="h-4 w-4 shrink-0" />
                    {ui.previewNotice}
                  </p>
                )}
                {mode === "import" && (
                  <p className="mt-2 flex gap-2 rounded-md bg-[var(--color-warning-muted)] p-3 text-xs text-[var(--color-warning-foreground)]">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {ui.writeNotice}
                  </p>
                )}
                {(mode === "preview" || mode === "import") && (
                  <div className="mt-3">
                    <Field
                      name="migration_config_json"
                      label={ui.importConfig}
                      failure={visibleFailure}
                    >
                      <textarea
                        id="migration_config_json"
                        name="migration_config_json"
                        rows={3}
                        value={inputs.migration_config_json}
                        onChange={(event) =>
                          updateInput(
                            "migration_config_json",
                            event.target.value,
                          )
                        }
                        className={`${INPUT} font-mono`}
                        aria-invalid={
                          visibleFailure?.field === "migration_config_json" ||
                          undefined
                        }
                        aria-describedby={
                          visibleFailure?.field === "migration_config_json"
                            ? "migration_config_json-error"
                            : undefined
                        }
                        spellCheck={false}
                      />
                    </Field>
                  </div>
                )}
                {mode === "schema" && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {textField(
                      "accounts_schema_expected_version",
                      ui.schemaExpected,
                    )}
                    {textField(
                      "accounts_schema_target_version",
                      ui.schemaTarget,
                    )}
                    <div className="sm:col-span-2">
                      {textField("accounts_schema_sha256", ui.schemaHash)}
                    </div>
                  </div>
                )}
              </section>
              <details
                className="group min-w-0"
                open={
                  visibleFailure?.field.startsWith("shared_") ||
                  visibleFailure?.field.startsWith("xconnect_") ||
                  undefined
                }
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[var(--color-heading)]">
                  <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  {ui.advanced}
                </summary>
                <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                  {ADVANCED_FIELDS.map(([key, label]) =>
                    textField(
                      key,
                      ui[label],
                      key.startsWith("xconnect_")
                        ? ui.gitopsDefault
                        : undefined,
                    ),
                  )}
                  <label className="flex items-start gap-2 text-xs sm:col-span-2">
                    <input
                      type="checkbox"
                      name="skip_stripe_catalog"
                      checked={inputs.skip_stripe_catalog}
                      onChange={(event) =>
                        updateInput("skip_stripe_catalog", event.target.checked)
                      }
                      className="mt-0.5 accent-[var(--color-primary)]"
                    />
                    <span>
                      {ui.stripe}
                      <span className="mt-1 block text-[var(--color-text-muted)]">
                        {ui.stripeHelp}
                      </span>
                    </span>
                  </label>
                </div>
              </details>
            </fieldset>
            <div className="space-y-3">
              <p className={NOTICE}>
                <Info className="h-4 w-4 shrink-0" />
                {environment === "prod"
                  ? ui.prodUnavailable
                  : ui.executionUnavailable}
              </p>
              {visibleFailure && (
                <p
                  role="alert"
                  className="break-words text-xs text-[var(--color-danger)]"
                >
                  {ui.validationError} <code>{visibleFailure.code}</code>
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    planning ||
                    environment === "prod" ||
                    !!currentFailure ||
                    (selectedRepositories && !inputs.repositories.trim())
                  }
                  className="tactile-button tactile-button-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {planning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  {planning ? ui.planning : ui.createPlan}
                </button>
                <button
                  type="button"
                  onClick={() => setShowParameters(!showParameters)}
                  aria-expanded={showParameters}
                  aria-controls="snapshot-parameters"
                  className="tactile-button tactile-button-soft"
                >
                  <Braces className="h-4 w-4" />
                  {ui.viewParameters}
                </button>
              </div>
            </div>
          </fieldset>
          <div aria-live="polite">
            {plan && (
              <p className="mt-4 text-sm font-medium text-[var(--color-primary)]">
                {ui.planCreated}
              </p>
            )}
          </div>
          {showParameters && (
            <div id="snapshot-parameters" className="mt-4 min-w-0">
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[var(--color-surface-muted)] p-4 text-xs">
                {currentPlan
                  ? JSON.stringify(plan ?? currentPlan, null, 2)
                  : ui.validationError}
              </pre>
            </div>
          )}
        </form>
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6">
          <section className={PANEL} aria-labelledby="plan-title">
            <div className="flex items-start gap-3">
              <ListOrdered className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
              <div>
                <h2
                  id="plan-title"
                  className="text-lg font-semibold text-[var(--color-heading)]"
                >
                  {ui.plan}
                </h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {ui.planHelp}
                </p>
              </div>
            </div>
            {stages.length ? (
              <ol className="mt-5 space-y-5">
                {stages.map((stage, index) => (
                  <li
                    key={stage}
                    className={`flex gap-3 rounded-lg ${stage === "preview" ? "bg-[var(--color-primary-muted)] p-3" : "px-2"}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-primary-border)] text-xs text-[var(--color-primary)]">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--color-heading)]">
                        {ui[stage] ?? stage}
                      </p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                        {ui.planned}
                      </p>
                      {stage === "preview" && (
                        <div className="mt-3 space-y-1 text-xs text-[var(--color-primary)]">
                          <p className="font-semibold">{ui.stopAtPreview}</p>
                          <p className="leading-relaxed">{ui.previewNotice}</p>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-xs text-[var(--color-danger)]">
                {ui.validationError}
              </p>
            )}
          </section>
          <section className={PANEL} aria-labelledby="recent-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="recent-title"
                className="flex items-center gap-2 text-sm font-semibold text-[var(--color-heading)]"
              >
                <Clock3 className="h-4 w-4 text-[var(--color-primary)]" />
                {ui.recent}
              </h2>
              <Link
                href="/panel/operations/releases"
                className="inline-flex items-center gap-1 text-xs text-[var(--color-primary)]"
              >
                {ui.releases}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mt-4 space-y-3" aria-live="polite">
              {isLoading ? (
                <p className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {ui.loading}
                </p>
              ) : error ? (
                <div
                  role="alert"
                  className="text-xs text-[var(--color-danger)]"
                >
                  <p>{ui.releaseUnavailable}</p>
                  <button
                    type="button"
                    onClick={() => void mutate()}
                    className="mt-2 underline"
                  >
                    {ui.releases}
                  </button>
                </div>
              ) : !recent.length ? (
                <p className="text-xs text-[var(--color-text-muted)]">
                  {ui.noReleases}
                </p>
              ) : (
                recent.map((release) => (
                  <a
                    key={release.id}
                    href={release.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block min-w-0 rounded-md border border-[color:var(--color-surface-border)] p-3 hover:bg-[var(--color-surface-hover)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <span className="break-all text-sm font-semibold">
                        {release.tag}
                      </span>
                      <span className="rounded bg-[var(--color-primary-muted)] px-2 py-1 text-xs text-[var(--color-primary)]">
                        {RELEASE_LABELS[release.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                      {release.environment.toUpperCase()} ·{" "}
                      {new Intl.DateTimeFormat("zh-CN", {
                        timeZone: "Asia/Shanghai",
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(release.startedAt))}
                    </p>
                    <p className="mt-2 flex items-center gap-1 break-all text-xs text-[var(--color-text-muted)]">
                      <GitBranch className="h-3.5 w-3.5 shrink-0" />
                      {release.workflow}
                    </p>
                  </a>
                ))
              )}
            </div>
            <p className="mt-4 text-xs text-[var(--color-text-muted)]">
              {ui.evidencePending}
            </p>
          </section>
          <section
            id="operations-mcp"
            className={PANEL}
            aria-labelledby="mcp-title"
          >
            <h2
              id="mcp-title"
              className="flex items-center gap-2 text-sm font-semibold text-[var(--color-heading)]"
            >
              <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
              {ui.mcp}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {ui.mcpHelp}
            </p>
            <code className="mt-3 block break-all rounded-md bg-[var(--color-surface-muted)] p-2 text-xs">
              {snapshotCatalog.mcp}
            </code>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {ui.mcpScope}
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
