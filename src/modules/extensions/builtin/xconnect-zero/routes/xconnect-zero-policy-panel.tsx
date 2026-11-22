"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  createDefaultXConnectZeroPolicy,
  evaluateXConnectZeroPolicyDraft,
  normalizeXConnectZeroPolicyArtifact,
  type XConnectZeroDevice,
  type XConnectZeroNetwork,
  type XConnectZeroPolicyAction,
  type XConnectZeroPolicyArtifact,
  type XConnectZeroPolicyExplainRequest,
  type XConnectZeroPolicyExplainResponse,
  type XConnectZeroPolicyProtocol,
  type XConnectZeroPolicyRule,
} from "@lib/xconnectZero";

export interface XConnectZeroPolicyPanelProps {
  zh: boolean;
  writeReady: boolean;
  activeNetwork: XConnectZeroNetwork | undefined;
  networks: XConnectZeroNetwork[];
  devices: XConnectZeroDevice[];
  onSelectNetwork: (networkId: string) => void;
  onPolicySaved: (saved: XConnectZeroPolicyArtifact) => void | Promise<void>;
}

type PolicyLoadState = "idle" | "loading" | "ready" | "not_found" | "error";

type Feedback = {
  kind: "success" | "warning" | "error";
  message: string;
};

type DraftRuleRow = {
  uid: string;
  rule: XConnectZeroPolicyRule;
  portsText: string;
};

type ExplainResultState = {
  mode: "control_plane" | "local_draft";
  fallbackNote?: string;
  request: XConnectZeroPolicyExplainRequest;
  response: XConnectZeroPolicyExplainResponse;
};

const POLICY_PROTOCOLS: XConnectZeroPolicyProtocol[] = [
  "all",
  "tcp",
  "udp",
  "icmp",
];

function isPortsDisabled(protocols: XConnectZeroPolicyProtocol[]): boolean {
  return (
    protocols.includes("all") ||
    (protocols.length === 1 && protocols[0] === "icmp")
  );
}

function parsePortsDraft(
  portsText: string,
  portsDisabled: boolean,
): { ports: number[]; valid: boolean } {
  if (portsDisabled) return { ports: [], valid: true };
  const trimmed = portsText.trim();
  if (!trimmed) return { ports: [], valid: true };
  const tokens = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (tokens.length === 0) return { ports: [], valid: true };

  const ports: number[] = [];
  for (const token of tokens) {
    if (!/^\d+$/.test(token)) {
      return { ports: [], valid: false };
    }
    const parsed = Number(token);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
      return { ports: [], valid: false };
    }
    if (!ports.includes(parsed)) {
      ports.push(parsed);
    }
  }
  return { ports, valid: true };
}

function formatDeviceLabel(device: XConnectZeroDevice, zh: boolean): string {
  const name = device.name || device.id;
  const address = device.wireguard_address?.trim();
  return address
    ? `${name} · ${address}`
    : `${name} · ${zh ? "未分配 IP" : "No IP"}`;
}

function arraysEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function nextGeneratedRuleId(rows: DraftRuleRow[]): string {
  const existing = new Set(rows.map((row) => row.rule.id.trim()));
  let index = rows.length + 1;
  while (existing.has(`rule-${index}`)) {
    index += 1;
  }
  return `rule-${index}`;
}

function errorCodeFromBody(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || !("error" in value)) {
    return undefined;
  }
  const err = (value as { error?: unknown }).error;
  return typeof err === "string" ? err : undefined;
}

export default function XConnectZeroPolicyPanel({
  zh,
  writeReady,
  activeNetwork,
  networks,
  devices,
  onSelectNetwork,
  onPolicySaved,
}: XConnectZeroPolicyPanelProps): JSX.Element {
  const rowSeqRef = useRef(0);
  const loadSeqRef = useRef(0);

  const nextUid = useCallback((): string => {
    rowSeqRef.current += 1;
    return `policy-row-${rowSeqRef.current}`;
  }, []);

  const toDraftRows = useCallback(
    (rules: XConnectZeroPolicyRule[]): DraftRuleRow[] =>
      rules.map((rule) => {
        const disabled = isPortsDisabled(rule.protocols);
        return {
          uid: nextUid(),
          rule: {
            ...rule,
            source_devices: [...rule.source_devices],
            destination_devices: [...rule.destination_devices],
            protocols: [...rule.protocols],
            ports: disabled ? [] : [...rule.ports],
          },
          portsText: disabled ? "" : rule.ports.join(", "),
        };
      }),
    [nextUid],
  );

  const [loadState, setLoadState] = useState<PolicyLoadState>("idle");
  const [savedPolicy, setSavedPolicy] = useState<XConnectZeroPolicyArtifact>(
    () =>
      createDefaultXConnectZeroPolicy(
        activeNetwork?.id ?? "",
        activeNetwork?.config_generation ?? 0,
      ),
  );
  const [draftDefaultAction, setDraftDefaultAction] =
    useState<XConnectZeroPolicyAction>("deny");
  const [draftRows, setDraftRows] = useState<DraftRuleRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const [simSourceId, setSimSourceId] = useState("");
  const [simDestId, setSimDestId] = useState("");
  const [simProtocol, setSimProtocol] =
    useState<XConnectZeroPolicyProtocol>("icmp");
  const [simPortInput, setSimPortInput] = useState("");
  const [simPending, setSimPending] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<ExplainResultState | null>(null);

  const networkDevices = useMemo(() => {
    if (!activeNetwork) return devices;
    return devices.filter(
      (device) => !device.network_id || device.network_id === activeNetwork.id,
    );
  }, [activeNetwork, devices]);

  const deviceLookup = useMemo(() => {
    const map = new Map<string, XConnectZeroDevice>();
    for (const device of networkDevices) {
      map.set(device.id, device);
    }
    return map;
  }, [networkDevices]);

  const gatewayDevice = useMemo(() => {
    if (!activeNetwork) return undefined;
    return (
      networkDevices.find(
        (device) =>
          device.role === "gateway" || device.id === activeNetwork.gateway_id,
      ) ?? devices.find((device) => device.id === activeNetwork.gateway_id)
    );
  }, [activeNetwork, devices, networkDevices]);

  useEffect(() => {
    setSimSourceId((current) => {
      if (current && networkDevices.some((device) => device.id === current)) {
        return current;
      }
      return networkDevices[0]?.id ?? "";
    });
    setSimDestId((current) => {
      if (current && networkDevices.some((device) => device.id === current)) {
        return current;
      }
      return networkDevices[1]?.id ?? networkDevices[0]?.id ?? "";
    });
  }, [networkDevices]);

  const loadPolicy = useCallback(
    async (network: XConnectZeroNetwork): Promise<void> => {
      const seq = ++loadSeqRef.current;
      const fallback = createDefaultXConnectZeroPolicy(
        network.id,
        network.config_generation ?? 0,
      );
      setLoadState("loading");
      setFeedback(null);
      setSimResult(null);
      setSimError(null);

      try {
        const response = await fetch(
          `/api/xconnect-zero/networks/${encodeURIComponent(network.id)}/policy`,
          { cache: "no-store" },
        );
        if (seq !== loadSeqRef.current) return;

        const body = (await response.json().catch(() => null)) as unknown;
        if (seq !== loadSeqRef.current) return;

        if (response.status === 404) {
          setSavedPolicy(fallback);
          setDraftDefaultAction(fallback.default_action);
          setDraftRows([]);
          setLoadState("not_found");
          return;
        }

        if (
          response.status === 503 ||
          errorCodeFromBody(body) === "control_plane_unavailable"
        ) {
          setSavedPolicy(fallback);
          setDraftDefaultAction(fallback.default_action);
          setDraftRows([]);
          setLoadState("error");
          setFeedback({
            kind: "warning",
            message: zh
              ? "控制面策略接口暂不可用，当前展示本地默认草稿。"
              : "Control-plane policy endpoint unavailable; showing local default draft.",
          });
          return;
        }

        if (!response.ok) {
          setSavedPolicy(fallback);
          setDraftDefaultAction(fallback.default_action);
          setDraftRows([]);
          setLoadState("error");
          setFeedback({
            kind: "error",
            message: zh
              ? `加载策略失败（HTTP ${response.status}）。`
              : `Failed to load policy (HTTP ${response.status}).`,
          });
          return;
        }

        const { artifact } = normalizeXConnectZeroPolicyArtifact(
          body,
          network.id,
          network.config_generation ?? 0,
        );
        setSavedPolicy(artifact);
        setDraftDefaultAction(artifact.default_action);
        setDraftRows(toDraftRows(artifact.rules));
        setLoadState("ready");
      } catch {
        if (seq !== loadSeqRef.current) return;
        setSavedPolicy(fallback);
        setDraftDefaultAction(fallback.default_action);
        setDraftRows([]);
        setLoadState("error");
        setFeedback({
          kind: "error",
          message: zh
            ? "加载网络策略失败，请检查控制面连接。"
            : "Failed to load network policy; check control-plane connectivity.",
        });
      }
    },
    [toDraftRows, zh],
  );

  useEffect(() => {
    if (!activeNetwork) {
      loadSeqRef.current += 1;
      const empty = createDefaultXConnectZeroPolicy("", 0);
      setLoadState("idle");
      setSavedPolicy(empty);
      setDraftDefaultAction(empty.default_action);
      setDraftRows([]);
      setFeedback(null);
      setSimResult(null);
      setSimError(null);
      return;
    }
    void loadPolicy(activeNetwork);
  }, [activeNetwork, loadPolicy]);

  const draftArtifact = useMemo<XConnectZeroPolicyArtifact>(
    () => ({
      schema_version: savedPolicy.schema_version || 1,
      compiler_version: savedPolicy.compiler_version || "1",
      network_id: activeNetwork?.id ?? savedPolicy.network_id,
      revision: savedPolicy.revision,
      default_action: draftDefaultAction,
      protected_flows: [...savedPolicy.protected_flows],
      rules: draftRows.map((row) => {
        const portsDisabled = isPortsDisabled(row.rule.protocols);
        const parsedPorts = parsePortsDraft(row.portsText, portsDisabled);
        return {
          ...row.rule,
          id: row.rule.id.trim(),
          ports: portsDisabled ? [] : parsedPorts.ports,
        };
      }),
    }),
    [activeNetwork?.id, draftDefaultAction, draftRows, savedPolicy],
  );

  const isDirty = useMemo(() => {
    if (draftDefaultAction !== savedPolicy.default_action) return true;
    if (draftRows.length !== savedPolicy.rules.length) return true;
    for (let i = 0; i < draftRows.length; i += 1) {
      const row = draftRows[i];
      const saved = savedPolicy.rules[i];
      const portsDisabled = isPortsDisabled(row.rule.protocols);
      const parsed = parsePortsDraft(row.portsText, portsDisabled);
      if (!parsed.valid) return true;
      if (row.rule.id !== saved.id) return true;
      if (row.rule.action !== saved.action) return true;
      if (!arraysEqual(row.rule.source_devices, saved.source_devices)) {
        return true;
      }
      if (
        !arraysEqual(row.rule.destination_devices, saved.destination_devices)
      ) {
        return true;
      }
      if (!arraysEqual(row.rule.protocols, saved.protocols)) return true;
      if (!arraysEqual(parsed.ports, saved.ports)) return true;
    }
    return false;
  }, [draftDefaultAction, draftRows, savedPolicy]);

  const targetGeneration =
    activeNetwork?.config_generation ?? savedPolicy.revision;
  const appliedGeneration = gatewayDevice?.applied_generation;
  const gatewaySynced = Boolean(
    gatewayDevice &&
      typeof targetGeneration === "number" &&
      typeof appliedGeneration === "number" &&
      appliedGeneration >= targetGeneration,
  );

  const controlsDisabled =
    !writeReady || !activeNetwork || loadState === "loading" || saving;

  const updateRow = (
    uid: string,
    updater: (current: DraftRuleRow) => DraftRuleRow,
  ): void => {
    setDraftRows((current) =>
      current.map((row) => (row.uid === uid ? updater(row) : row)),
    );
    setFeedback(null);
  };

  const toggleRuleTarget = (
    uid: string,
    field: "source_devices" | "destination_devices",
    targetId: string,
  ): void => {
    updateRow(uid, (row) => {
      const current = row.rule[field];
      let next: string[];
      if (targetId === "*") {
        next = current.includes("*") ? [] : ["*"];
      } else {
        const withoutWildcard = current.filter((item) => item !== "*");
        next = withoutWildcard.includes(targetId)
          ? withoutWildcard.filter((item) => item !== targetId)
          : [...withoutWildcard, targetId];
      }
      return {
        ...row,
        rule: {
          ...row.rule,
          [field]: next,
        },
      };
    });
  };

  const toggleRuleProtocol = (
    uid: string,
    proto: XConnectZeroPolicyProtocol,
  ): void => {
    updateRow(uid, (row) => {
      const current = row.rule.protocols;
      let next: XConnectZeroPolicyProtocol[];
      if (proto === "all") {
        next = current.includes("all") ? [] : ["all"];
      } else {
        const withoutAll = current.filter((item) => item !== "all");
        next = withoutAll.includes(proto)
          ? withoutAll.filter((item) => item !== proto)
          : [...withoutAll, proto];
      }
      const portsDisabled = isPortsDisabled(next);
      return {
        ...row,
        rule: {
          ...row.rule,
          protocols: next,
          ports: portsDisabled ? [] : row.rule.ports,
        },
        portsText: portsDisabled ? "" : row.portsText,
      };
    });
  };

  const addRule = (): void => {
    const newId = nextGeneratedRuleId(draftRows);
    setDraftRows((current) => [
      ...current,
      {
        uid: nextUid(),
        rule: {
          id: newId,
          action: "allow",
          source_devices: [],
          destination_devices: [],
          protocols: [],
          ports: [],
        },
        portsText: "",
      },
    ]);
    setFeedback(null);
  };

  const deleteRule = (uid: string): void => {
    setDraftRows((current) => current.filter((row) => row.uid !== uid));
    setFeedback(null);
  };

  const moveRule = (index: number, delta: -1 | 1): void => {
    const targetIndex = index + delta;
    if (targetIndex < 0 || targetIndex >= draftRows.length) return;
    setDraftRows((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setFeedback(null);
  };

  const applyAllowAllIcmpTemplate = (): void => {
    setDraftRows((current) => {
      const existingIndex = current.findIndex(
        (row) => row.rule.id.trim() === "allow-all-icmp",
      );
      const templateRule: XConnectZeroPolicyRule = {
        id: "allow-all-icmp",
        action: "allow",
        source_devices: ["*"],
        destination_devices: ["*"],
        protocols: ["icmp"],
        ports: [],
      };
      if (existingIndex >= 0) {
        return current.map((row, idx) =>
          idx === existingIndex
            ? { ...row, rule: templateRule, portsText: "" }
            : row,
        );
      }
      return [
        ...current,
        {
          uid: nextUid(),
          rule: templateRule,
          portsText: "",
        },
      ];
    });
    setFeedback({
      kind: "success",
      message: zh
        ? "已应用模板：允许全部节点 Ping (ICMP)（allow-all-icmp）。请点击“保存并下发策略”生效。"
        : "Template applied: allow-all-icmp (* -> * icmp). Click Save & Apply Policy to dispatch.",
    });
  };

  const applyFullMeshTemplate = (): void => {
    setDraftDefaultAction("allow");
    setFeedback({
      kind: "success",
      message: zh
        ? "已切换为全互联模式（默认允许 allow）。请点击“保存并下发策略”生效。"
        : "Switched to Full Mesh Mode (default allow). Click Save & Apply Policy to dispatch.",
    });
  };

  const resetChanges = (): void => {
    setDraftDefaultAction(savedPolicy.default_action);
    setDraftRows(toDraftRows(savedPolicy.rules));
    setFeedback(null);
  };

  const validateAndBuildPayload = (): {
    payload?: XConnectZeroPolicyArtifact;
    error?: string;
  } => {
    if (!activeNetwork) {
      return {
        error: zh ? "请先选择一个网络。" : "Select a network first.",
      };
    }
    const seenIds = new Set<string>();
    const validatedRules: XConnectZeroPolicyRule[] = [];

    for (let i = 0; i < draftRows.length; i += 1) {
      const row = draftRows[i];
      const ruleId = row.rule.id.trim();
      const label = `#${i + 1}`;
      if (!ruleId) {
        return {
          error: zh
            ? `规则 ${label} 的规则 ID 不能为空。`
            : `Rule ${label} must have a non-empty Rule ID.`,
        };
      }
      if (seenIds.has(ruleId)) {
        return {
          error: zh
            ? `规则 ID "${ruleId}" 重复，请确保每条规则 ID 唯一。`
            : `Duplicate Rule ID "${ruleId}"; each rule ID must be unique.`,
        };
      }
      seenIds.add(ruleId);

      if (row.rule.source_devices.length === 0) {
        return {
          error: zh
            ? `规则 "${ruleId}" 至少需要选择一个源设备或全部设备 (*)。`
            : `Rule "${ruleId}" requires at least one source device or All devices (*).`,
        };
      }
      if (row.rule.destination_devices.length === 0) {
        return {
          error: zh
            ? `规则 "${ruleId}" 至少需要选择一个目标设备或全部设备 (*)。`
            : `Rule "${ruleId}" requires at least one destination device or All devices (*).`,
        };
      }
      if (row.rule.protocols.length === 0) {
        return {
          error: zh
            ? `规则 "${ruleId}" 至少需要选择一个协议。`
            : `Rule "${ruleId}" requires at least one protocol.`,
        };
      }

      const portsDisabled = isPortsDisabled(row.rule.protocols);
      const parsedPorts = parsePortsDraft(row.portsText, portsDisabled);
      if (!parsedPorts.valid) {
        return {
          error: zh
            ? `规则 "${ruleId}" 的端口格式无效，请填写 1-65535 之间以逗号分隔的端口号。`
            : `Rule "${ruleId}" has invalid ports; enter comma-separated integers between 1 and 65535.`,
        };
      }

      validatedRules.push({
        ...(typeof row.rule.whole_device === "boolean"
          ? { whole_device: row.rule.whole_device }
          : {}),
        id: ruleId,
        action: row.rule.action,
        source_devices: [...row.rule.source_devices],
        destination_devices: [...row.rule.destination_devices],
        protocols: [...row.rule.protocols],
        ports: parsedPorts.ports,
      });
    }

    return {
      payload: {
        schema_version: savedPolicy.schema_version || 1,
        compiler_version: savedPolicy.compiler_version || "1",
        network_id: activeNetwork.id,
        revision: savedPolicy.revision,
        default_action: draftDefaultAction,
        protected_flows: [...savedPolicy.protected_flows],
        rules: validatedRules,
      },
    };
  };

  const savePolicy = async (): Promise<void> => {
    if (controlsDisabled || !activeNetwork) return;
    const { payload, error } = validateAndBuildPayload();
    if (!payload) {
      setFeedback({
        kind: "error",
        message: error ?? (zh ? "策略校验失败。" : "Policy validation failed."),
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(
        `/api/xconnect-zero/networks/${encodeURIComponent(activeNetwork.id)}/policy`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        const code = errorCodeFromBody(body);
        if (response.status === 413 || code === "request_too_large") {
          setFeedback({
            kind: "error",
            message: zh
              ? "策略体积超过 64 KB 上限，请精简规则数量。"
              : "Policy payload exceeds the 64 KB limit; reduce the number of rules.",
          });
          return;
        }
        if (response.status === 409) {
          setFeedback({
            kind: "error",
            message: zh
              ? "策略版本冲突（409），请刷新后重试。"
              : "Policy revision conflict (409); reload and retry.",
          });
          return;
        }
        if (response.status === 404 || response.status === 503) {
          setFeedback({
            kind: "error",
            message: zh
              ? `控制面策略保存接口不可用（HTTP ${response.status}）。`
              : `Control-plane policy save endpoint unavailable (HTTP ${response.status}).`,
          });
          return;
        }
        setFeedback({
          kind: "error",
          message: zh
            ? `保存并下发策略失败（HTTP ${response.status}${code ? ` · ${code}` : ""}）。`
            : `Failed to save policy (HTTP ${response.status}${code ? ` · ${code}` : ""}).`,
        });
        return;
      }

      const { artifact, recognized } = normalizeXConnectZeroPolicyArtifact(
        body,
        activeNetwork.id,
        (activeNetwork.config_generation ?? payload.revision) + 1,
      );
      const nextSaved = recognized
        ? artifact
        : {
            ...payload,
            revision: Math.max(
              payload.revision + 1,
              activeNetwork.config_generation ?? 0,
            ),
          };
      setSavedPolicy(nextSaved);
      setDraftDefaultAction(nextSaved.default_action);
      setDraftRows(toDraftRows(nextSaved.rules));
      setLoadState("ready");
      setFeedback({
        kind: "success",
        message: zh
          ? `策略已保存并下发（Rev #${nextSaved.revision}），等待网关节点同步收敛。`
          : `Policy saved and dispatched (Rev #${nextSaved.revision}); awaiting gateway convergence.`,
      });
      await onPolicySaved(nextSaved);
    } catch {
      setFeedback({
        kind: "error",
        message: zh
          ? "保存策略请求失败，请检查网络连接。"
          : "Failed to save policy; check network connectivity.",
      });
    } finally {
      setSaving(false);
    }
  };

  const simPortDisabled = simProtocol === "icmp" || simProtocol === "all";

  const runExplain = async (): Promise<void> => {
    if (!activeNetwork || !simSourceId || !simDestId || simPending) return;
    setSimError(null);

    let parsedPort: number | undefined;
    if (!simPortDisabled && simPortInput.trim()) {
      if (!/^\d+$/.test(simPortInput.trim())) {
        setSimError(
          zh
            ? "端口必须是 1 到 65535 之间的整数。"
            : "Port must be an integer between 1 and 65535.",
        );
        return;
      }
      const num = Number(simPortInput.trim());
      if (!Number.isInteger(num) || num < 1 || num > 65535) {
        setSimError(
          zh
            ? "端口必须是 1 到 65535 之间的整数。"
            : "Port must be an integer between 1 and 65535.",
        );
        return;
      }
      parsedPort = num;
    }

    const requestPayload: XConnectZeroPolicyExplainRequest = {
      source_device_id: simSourceId,
      destination_device_id: simDestId,
      protocol: simProtocol,
      ...(parsedPort !== undefined ? { port: parsedPort } : {}),
    };

    if (isDirty || loadState === "not_found") {
      const localResult = evaluateXConnectZeroPolicyDraft(
        draftArtifact,
        requestPayload,
        networkDevices,
      );
      setSimResult({
        mode: "local_draft",
        fallbackNote: isDirty
          ? zh
            ? "当前存在未保存修改，已使用本地草稿进行即时预演。"
            : "Unsaved edits present; evaluated against the local draft."
          : zh
            ? "控制面尚未保存策略，已使用本地草稿进行预演。"
            : "No remote policy saved yet; evaluated against the local draft.",
        request: requestPayload,
        response: localResult,
      });
      return;
    }

    setSimPending(true);
    try {
      const response = await fetch(
        `/api/xconnect-zero/networks/${encodeURIComponent(activeNetwork.id)}/policy/explain`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        },
      );
      const body = (await response.json().catch(() => null)) as
        | XConnectZeroPolicyExplainResponse
        | { error?: unknown }
        | null;

      if (
        response.status === 404 ||
        response.status === 503 ||
        errorCodeFromBody(body) === "control_plane_unavailable"
      ) {
        const localResult = evaluateXConnectZeroPolicyDraft(
          draftArtifact,
          requestPayload,
          networkDevices,
        );
        setSimResult({
          mode: "local_draft",
          fallbackNote: zh
            ? `控制面暂未提供 Explain 接口（HTTP ${response.status}），已自动切换为本地草稿预演。`
            : `Control-plane explain unavailable (HTTP ${response.status}); evaluated locally.`,
          request: requestPayload,
          response: localResult,
        });
        return;
      }

      if (
        !response.ok ||
        !body ||
        !("decision" in body) ||
        (body.decision !== "allow" && body.decision !== "deny")
      ) {
        const code = errorCodeFromBody(body);
        setSimError(
          zh
            ? `策略模拟检测失败（HTTP ${response.status}${code ? ` · ${code}` : ""}）。`
            : `Policy explain failed (HTTP ${response.status}${code ? ` · ${code}` : ""}).`,
        );
        return;
      }

      const srcAddr =
        body.source_address ||
        deviceLookup.get(requestPayload.source_device_id)?.wireguard_address;
      const dstAddr =
        body.destination_address ||
        deviceLookup.get(requestPayload.destination_device_id)
          ?.wireguard_address;
      setSimResult({
        mode: "control_plane",
        request: requestPayload,
        response: {
          ...body,
          ...(srcAddr ? { source_address: srcAddr } : {}),
          ...(dstAddr ? { destination_address: dstAddr } : {}),
        },
      });
    } catch {
      const localResult = evaluateXConnectZeroPolicyDraft(
        draftArtifact,
        requestPayload,
        networkDevices,
      );
      setSimResult({
        mode: "local_draft",
        fallbackNote: zh
          ? "控制面请求异常，已回退为本地草稿预演。"
          : "Control-plane request failed; evaluated against the local draft.",
        request: requestPayload,
        response: localResult,
      });
    } finally {
      setSimPending(false);
    }
  };

  return (
    <section className="rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--color-divider)] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-[8px] bg-[var(--color-primary-muted)] p-2 text-[var(--color-primary)]">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--color-heading)]">
                {zh
                  ? "微隔离与访问策略"
                  : "Micro-Segmentation & Access Policy"}
              </h2>
              <span className="rounded-full bg-[var(--color-surface-muted)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--color-heading)]">
                Rev #{targetGeneration ?? savedPolicy.revision}
              </span>
              {activeNetwork && gatewayDevice ? (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    gatewaySynced
                      ? "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]"
                      : "bg-[var(--color-warning-muted)] text-[var(--color-warning-foreground)]"
                  }`}
                >
                  {gatewaySynced ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  {gatewaySynced
                    ? zh
                      ? "已同步"
                      : "Synced"
                    : zh
                      ? "待网关收敛"
                      : "Pending gateway convergence"}
                  {typeof appliedGeneration === "number"
                    ? ` (Gen #${appliedGeneration}/${targetGeneration ?? 0})`
                    : ""}
                </span>
              ) : activeNetwork ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                  {zh ? "未检测到网关" : "No gateway detected"}
                </span>
              ) : null}
              {isDirty ? (
                <span className="rounded-full bg-[var(--color-warning-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-warning-foreground)]">
                  {zh ? "有未保存修改" : "Unsaved changes"}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
              {zh
                ? "基于设备身份 ID 下发零信任访问规则，始终动态解析节点 Overlay IP。"
                : "Author identity-based zero-trust rules by device ID; overlay IPs are resolved dynamically."}
            </p>
          </div>
        </div>

        {networks.length > 0 ? (
          <label className="min-w-60 text-xs font-semibold text-[var(--color-heading)]">
            {zh ? "策略目标网络" : "Policy target network"}
            <select
              aria-label={zh ? "策略目标网络" : "Policy target network"}
              value={activeNetwork?.id ?? ""}
              onChange={(event) => onSelectNetwork(event.target.value)}
              disabled={!writeReady || saving}
              className="mt-1 block w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-normal disabled:opacity-50"
            >
              {networks.map((network) => (
                <option key={network.id} value={network.id}>
                  {network.display_name || network.id} · {network.id}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      {!activeNetwork ? (
        <div className="p-5 text-sm text-[var(--color-text-muted)]">
          {zh
            ? "暂无可用的网关网络，加载或创建网络后即可配置微隔离策略。"
            : "No authorized network available yet; load or create a network to configure micro-segmentation policy."}
        </div>
      ) : (
        <div className="space-y-6 p-5">
          {loadState === "loading" ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/50 px-3 py-2 text-sm text-[var(--color-text-muted)]"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              {zh ? "正在加载网络策略…" : "Loading network policy…"}
            </div>
          ) : null}

          {loadState === "not_found" ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/60 px-3 py-2 text-sm text-[var(--color-text-subtle)]"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {zh
                  ? "控制面尚未返回该网络的已保存策略（404），当前以默认隔离草稿（deny）初始化，可编辑保存或进行本地预演。"
                  : "No saved policy returned by the control plane (404); initialized with default deny draft for editing or local preview."}
              </span>
            </div>
          ) : null}

          {/* Default Micro-Segmentation Mode & Quick Templates */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-heading)]">
                  {zh ? "默认微隔离模式" : "Default Micro-Segmentation Mode"}
                </h3>
                <p className="text-xs text-[var(--color-text-subtle)]">
                  {zh
                    ? "当流量未命中任何显式规则时执行的兜底策略。"
                    : "Fallback verdict applied when traffic matches no explicit rule."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={applyAllowAllIcmpTemplate}
                  disabled={controlsDisabled}
                  className="tactile-button tactile-button-soft px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {zh
                    ? "允许全部节点 Ping (ICMP)"
                    : "Allow All Nodes Ping (ICMP)"}
                </button>
                <button
                  type="button"
                  onClick={applyFullMeshTemplate}
                  disabled={controlsDisabled}
                  className="tactile-button tactile-button-soft px-3 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {zh
                    ? "全互联模式（默认允许）"
                    : "Full Mesh Mode (Default Allow)"}
                </button>
              </div>
            </div>

            <fieldset className="grid gap-3 md:grid-cols-2">
              <legend className="sr-only">
                {zh ? "选择默认微隔离模式" : "Select default micro-segmentation mode"}
              </legend>
              {(
                [
                  {
                    value: "deny" as const,
                    title: zh
                      ? "默认拒绝 / 节点隔离 (deny)"
                      : "Default Deny / Node Isolation (deny)",
                    description: zh
                      ? "默认阻断未授权的节点间互通，仅放行下方规则显式允许的设备与端口。"
                      : "Isolate nodes by default; only traffic explicitly allowed by rules below can pass.",
                    recommended: true,
                    icon: ShieldAlert,
                  },
                  {
                    value: "allow" as const,
                    title: zh
                      ? "默认允许 / 全互联 (allow)"
                      : "Default Allow / Full Mesh (allow)",
                    description: zh
                      ? "网络内节点默认全互联互通，仅阻断下方显式标记为 deny 的规则流量。"
                      : "Allow all inter-node traffic by default unless explicitly blocked by a deny rule.",
                    recommended: false,
                    icon: ShieldCheck,
                  },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                const selected = draftDefaultAction === option.value;
                return (
                  <label
                    key={option.value}
                    aria-disabled={controlsDisabled ? "true" : undefined}
                    className={`flex ${controlsDisabled ? "cursor-not-allowed opacity-70" : "cursor-pointer"} items-start gap-3 rounded-[var(--radius-lg)] border p-4 ${
                      selected
                        ? "border-[color:var(--color-primary)] bg-[var(--color-primary-muted)]/35 ring-1 ring-[color:var(--color-primary)]"
                        : "border-[color:var(--color-surface-border)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="xconnect-policy-default-action"
                      value={option.value}
                      checked={selected}
                      disabled={controlsDisabled}
                      onChange={() => {
                        setDraftDefaultAction(option.value);
                        setFeedback(null);
                      }}
                      className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                        <span className="text-sm font-semibold text-[var(--color-heading)]">
                          {option.title}
                        </span>
                        {option.recommended ? (
                          <span className="rounded-full bg-[var(--color-success-muted)] px-2 py-0.5 text-eyebrow font-semibold text-[var(--color-success-foreground)]">
                            {zh ? "推荐" : "Recommended"}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[var(--color-text-subtle)]">
                        {option.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </fieldset>
          </div>

          {/* Visual Policy Rules Editor */}
          <div className="space-y-3 border-t border-[color:var(--color-divider)] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-heading)]">
                  {zh
                    ? `策略规则列表 (${draftRows.length})`
                    : `Policy Rules (${draftRows.length})`}
                </h3>
                <p className="text-xs text-[var(--color-text-subtle)]">
                  {zh
                    ? "按自上而下顺序首条命中生效（First-match-wins）；所有节点引用仅存储 device_id。"
                    : "Evaluated top-to-bottom (first-match-wins); rules persist device_id references only."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addRule}
                  disabled={controlsDisabled}
                  className="tactile-button tactile-button-soft px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {zh ? "添加规则" : "Add Rule"}
                </button>
                <button
                  type="button"
                  onClick={resetChanges}
                  disabled={!isDirty || saving}
                  className="tactile-button tactile-button-soft px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  {zh ? "重置修改" : "Reset Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => void savePolicy()}
                  disabled={
                    controlsDisabled || (!isDirty && loadState === "ready")
                  }
                  className="tactile-button tactile-button-primary px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving
                    ? zh
                      ? "保存中…"
                      : "Saving…"
                    : zh
                      ? "保存并下发策略"
                      : "Save & Apply Policy"}
                </button>
              </div>
            </div>

            {feedback ? (
              <div
                role={feedback.kind === "error" ? "alert" : "status"}
                aria-live="polite"
                className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
                  feedback.kind === "error"
                    ? "border-[color:var(--color-danger)] bg-[var(--color-danger-muted)] text-[var(--color-danger-foreground)]"
                    : feedback.kind === "warning"
                      ? "border-[color:var(--color-warning-muted)] bg-[var(--color-warning-muted)]/50 text-[var(--color-warning-foreground)]"
                      : "border-[color:var(--color-success)]/40 bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]"
                }`}
              >
                {feedback.kind === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            ) : null}

            {draftRows.length === 0 ? (
              <div className="rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-surface-border)] px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                {zh
                  ? "暂无显式策略规则。可点击上方快捷模板或“添加规则”创建微隔离规则。"
                  : "No explicit rules configured. Use a quick template or click Add Rule to create one."}
              </div>
            ) : (
              <div className="space-y-3">
                {draftRows.map((row, index) => {
                  const portsDisabled = isPortsDisabled(row.rule.protocols);
                  const unknownSourceIds = row.rule.source_devices.filter(
                    (id) => id !== "*" && !deviceLookup.has(id),
                  );
                  const unknownDestIds = row.rule.destination_devices.filter(
                    (id) => id !== "*" && !deviceLookup.has(id),
                  );

                  return (
                    <div
                      key={row.uid}
                      data-testid={`policy-rule-${index}`}
                      className="space-y-3 rounded-[var(--radius-lg)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/30 p-4"
                    >
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="flex flex-wrap items-end gap-3">
                          <span className="rounded bg-[var(--color-surface-muted)] px-2 py-1 font-mono text-xs font-semibold text-[var(--color-heading)]">
                            #{index + 1}
                          </span>
                          <label className="text-xs font-semibold text-[var(--color-heading)]">
                            {zh ? "规则 ID" : "Rule ID"}
                            <input
                              type="text"
                              aria-label={
                                zh
                                  ? `规则 #${index + 1} ID`
                                  : `Rule #${index + 1} ID`
                              }
                              value={row.rule.id}
                              disabled={controlsDisabled}
                              onChange={(event) =>
                                updateRow(row.uid, (current) => ({
                                  ...current,
                                  rule: {
                                    ...current.rule,
                                    id: event.target.value,
                                  },
                                }))
                              }
                              className="mt-1 block w-48 rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-sm font-normal disabled:opacity-50"
                            />
                          </label>
                          <label className="text-xs font-semibold text-[var(--color-heading)]">
                            {zh ? "动作" : "Action"}
                            <select
                              aria-label={
                                zh
                                  ? `规则 #${index + 1} 动作`
                                  : `Rule #${index + 1} action`
                              }
                              value={row.rule.action}
                              disabled={controlsDisabled}
                              onChange={(event) =>
                                updateRow(row.uid, (current) => ({
                                  ...current,
                                  rule: {
                                    ...current.rule,
                                    action: event.target
                                      .value as XConnectZeroPolicyAction,
                                  },
                                }))
                              }
                              className="mt-1 block rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm font-normal disabled:opacity-50"
                            >
                              <option value="allow">
                                {zh ? "允许 (allow)" : "Allow (allow)"}
                              </option>
                              <option value="deny">
                                {zh ? "拒绝 (deny)" : "Deny (deny)"}
                              </option>
                            </select>
                          </label>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => moveRule(index, -1)}
                            disabled={controlsDisabled || index === 0}
                            aria-label={
                              zh
                                ? `上移规则 #${index + 1}`
                                : `Move rule #${index + 1} up`
                            }
                            className="tactile-button tactile-button-soft px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                            {zh ? "上移" : "Up"}
                          </button>
                          <button
                            type="button"
                            onClick={() => moveRule(index, 1)}
                            disabled={
                              controlsDisabled || index === draftRows.length - 1
                            }
                            aria-label={
                              zh
                                ? `下移规则 #${index + 1}`
                                : `Move rule #${index + 1} down`
                            }
                            className="tactile-button tactile-button-soft px-2.5 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                            {zh ? "下移" : "Down"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRule(row.uid)}
                            disabled={controlsDisabled}
                            aria-label={
                              zh
                                ? `删除规则 #${index + 1}`
                                : `Delete rule #${index + 1}`
                            }
                            className="tactile-button tactile-button-soft px-2.5 py-1.5 text-xs text-[var(--color-danger-foreground)] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {zh ? "删除" : "Delete"}
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        <fieldset className="rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3">
                          <legend className="px-1 text-xs font-semibold text-[var(--color-heading)]">
                            {zh ? "源设备 (Source)" : "Source Devices"}
                          </legend>
                          <div className="flex flex-wrap gap-1.5">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[color:var(--color-surface-border)] px-2 py-1 text-xs">
                              <input
                                type="checkbox"
                                checked={row.rule.source_devices.includes("*")}
                                disabled={controlsDisabled}
                                onChange={() =>
                                  toggleRuleTarget(
                                    row.uid,
                                    "source_devices",
                                    "*",
                                  )
                                }
                              />
                              <span>{zh ? "全部设备 (*)" : "All devices (*)"}</span>
                            </label>
                            {networkDevices.map((device) => (
                              <label
                                key={device.id}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[color:var(--color-surface-border)] px-2 py-1 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={row.rule.source_devices.includes(
                                    device.id,
                                  )}
                                  disabled={controlsDisabled}
                                  onChange={() =>
                                    toggleRuleTarget(
                                      row.uid,
                                      "source_devices",
                                      device.id,
                                    )
                                  }
                                />
                                <span>{formatDeviceLabel(device, zh)}</span>
                              </label>
                            ))}
                            {unknownSourceIds.map((id) => (
                              <label
                                key={id}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[color:var(--color-warning-muted)] px-2 py-1 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked
                                  disabled={controlsDisabled}
                                  onChange={() =>
                                    toggleRuleTarget(
                                      row.uid,
                                      "source_devices",
                                      id,
                                    )
                                  }
                                />
                                <span>
                                  {id} ({zh ? "未知设备" : "Unknown"})
                                </span>
                              </label>
                            ))}
                          </div>
                        </fieldset>

                        <fieldset className="rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3">
                          <legend className="px-1 text-xs font-semibold text-[var(--color-heading)]">
                            {zh
                              ? "目标设备 (Destination)"
                              : "Destination Devices"}
                          </legend>
                          <div className="flex flex-wrap gap-1.5">
                            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[color:var(--color-surface-border)] px-2 py-1 text-xs">
                              <input
                                type="checkbox"
                                checked={row.rule.destination_devices.includes(
                                  "*",
                                )}
                                disabled={controlsDisabled}
                                onChange={() =>
                                  toggleRuleTarget(
                                    row.uid,
                                    "destination_devices",
                                    "*",
                                  )
                                }
                              />
                              <span>{zh ? "全部设备 (*)" : "All devices (*)"}</span>
                            </label>
                            {networkDevices.map((device) => (
                              <label
                                key={device.id}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[color:var(--color-surface-border)] px-2 py-1 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked={row.rule.destination_devices.includes(
                                    device.id,
                                  )}
                                  disabled={controlsDisabled}
                                  onChange={() =>
                                    toggleRuleTarget(
                                      row.uid,
                                      "destination_devices",
                                      device.id,
                                    )
                                  }
                                />
                                <span>{formatDeviceLabel(device, zh)}</span>
                              </label>
                            ))}
                            {unknownDestIds.map((id) => (
                              <label
                                key={id}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[color:var(--color-warning-muted)] px-2 py-1 text-xs"
                              >
                                <input
                                  type="checkbox"
                                  checked
                                  disabled={controlsDisabled}
                                  onChange={() =>
                                    toggleRuleTarget(
                                      row.uid,
                                      "destination_devices",
                                      id,
                                    )
                                  }
                                />
                                <span>
                                  {id} ({zh ? "未知设备" : "Unknown"})
                                </span>
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <fieldset className="rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3">
                          <legend className="px-1 text-xs font-semibold text-[var(--color-heading)]">
                            {zh ? "协议 (Protocols)" : "Protocols"}
                          </legend>
                          <div className="flex flex-wrap gap-2">
                            {POLICY_PROTOCOLS.map((proto) => (
                              <label
                                key={proto}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded border border-[color:var(--color-surface-border)] px-2.5 py-1 text-xs font-medium uppercase"
                              >
                                <input
                                  type="checkbox"
                                  checked={row.rule.protocols.includes(proto)}
                                  disabled={controlsDisabled}
                                  onChange={() =>
                                    toggleRuleProtocol(row.uid, proto)
                                  }
                                />
                                <span>{proto}</span>
                              </label>
                            ))}
                          </div>
                        </fieldset>

                        <label className="rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-3 text-xs font-semibold text-[var(--color-heading)]">
                          {zh ? "端口 (CSV)" : "Ports (CSV)"}
                          <input
                            type="text"
                            aria-label={
                              zh
                                ? `规则 #${index + 1} 端口 (CSV)`
                                : `Rule #${index + 1} ports (CSV)`
                            }
                            value={portsDisabled ? "" : row.portsText}
                            disabled={controlsDisabled || portsDisabled}
                            placeholder={
                              portsDisabled
                                ? zh
                                  ? "ICMP / ALL 协议无需端口"
                                  : "Not applicable for ICMP / ALL"
                                : zh
                                  ? "留空表示全部端口，例如 22, 80, 443"
                                  : "Empty = all ports, e.g. 22, 80, 443"
                            }
                            onChange={(event) =>
                              updateRow(row.uid, (current) => ({
                                ...current,
                                portsText: event.target.value,
                              }))
                            }
                            className="mt-1.5 block w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-sm font-normal disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] disabled:opacity-60"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Protected Flows Summary (read-only) */}
          {savedPolicy.protected_flows.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)]/60 px-4 py-3 text-xs text-[var(--color-text-subtle)]">
              <strong className="text-[var(--color-heading)]">
                {zh ? "受保护控制面流量" : "Protected control flows"}:
              </strong>
              {savedPolicy.protected_flows.map((flow) => (
                <code
                  key={flow}
                  className="rounded bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
                >
                  {flow}
                </code>
              ))}
            </div>
          ) : null}

          {/* Policy Explain Simulator */}
          <div className="space-y-4 border-t border-[color:var(--color-divider)] pt-5">
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-heading)]">
                {zh ? "策略模拟验证" : "Policy Explain Simulator"}
              </h3>
              <p className="text-xs text-[var(--color-text-subtle)]">
                {zh
                  ? "选择源节点、目标节点与协议端口，模拟真实五元组匹配结果；无未保存修改时调用控制面裁决，有草稿修改或控制面暂未开放时自动切换本地预演。"
                  : "Test traffic matching across source, destination, protocol, and optional port using control-plane explain or local draft evaluation."}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
              <label className="text-xs font-semibold text-[var(--color-heading)]">
                {zh ? "模拟源设备" : "Explain source device"}
                <select
                  aria-label={zh ? "模拟源设备" : "Explain source device"}
                  value={simSourceId}
                  onChange={(event) => setSimSourceId(event.target.value)}
                  disabled={networkDevices.length === 0 || simPending}
                  className="mt-1 block w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-2 text-sm font-normal disabled:opacity-50"
                >
                  {networkDevices.length === 0 ? (
                    <option value="">
                      {zh ? "暂无可用设备" : "No devices available"}
                    </option>
                  ) : null}
                  {networkDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {formatDeviceLabel(device, zh)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-[var(--color-heading)]">
                {zh ? "模拟目标设备" : "Explain destination device"}
                <select
                  aria-label={zh ? "模拟目标设备" : "Explain destination device"}
                  value={simDestId}
                  onChange={(event) => setSimDestId(event.target.value)}
                  disabled={networkDevices.length === 0 || simPending}
                  className="mt-1 block w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-2 text-sm font-normal disabled:opacity-50"
                >
                  {networkDevices.length === 0 ? (
                    <option value="">
                      {zh ? "暂无可用设备" : "No devices available"}
                    </option>
                  ) : null}
                  {networkDevices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {formatDeviceLabel(device, zh)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold text-[var(--color-heading)]">
                {zh ? "模拟协议" : "Explain protocol"}
                <select
                  aria-label={zh ? "模拟协议" : "Explain protocol"}
                  value={simProtocol}
                  onChange={(event) => {
                    const nextProto = event.target
                      .value as XConnectZeroPolicyProtocol;
                    setSimProtocol(nextProto);
                    if (nextProto === "icmp" || nextProto === "all") {
                      setSimPortInput("");
                    }
                  }}
                  disabled={simPending}
                  className="mt-1 block w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-2 text-sm font-normal disabled:opacity-50"
                >
                  <option value="icmp">icmp</option>
                  <option value="tcp">tcp</option>
                  <option value="udp">udp</option>
                  <option value="all">all</option>
                </select>
              </label>

              <label className="text-xs font-semibold text-[var(--color-heading)]">
                {zh ? "模拟端口（可选）" : "Explain port (optional)"}
                <input
                  type="number"
                  min={1}
                  max={65535}
                  aria-label={
                    zh ? "模拟端口（可选）" : "Explain port (optional)"
                  }
                  value={simPortDisabled ? "" : simPortInput}
                  disabled={simPortDisabled || simPending}
                  placeholder={simPortDisabled ? "—" : "443"}
                  onChange={(event) => setSimPortInput(event.target.value)}
                  className="mt-1 block w-full rounded border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-2.5 py-2 font-mono text-sm font-normal disabled:cursor-not-allowed disabled:bg-[var(--color-surface-muted)] disabled:opacity-60"
                />
              </label>

              <button
                type="button"
                onClick={() => void runExplain()}
                disabled={!simSourceId || !simDestId || simPending}
                className="tactile-button tactile-button-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {simPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {zh ? "模拟检测" : "Run Explain"}
              </button>
            </div>

            {simError ? (
              <p
                role="alert"
                className="rounded border border-[color:var(--color-danger)] bg-[var(--color-danger-muted)] px-3 py-2 text-sm text-[var(--color-danger-foreground)]"
              >
                {simError}
              </p>
            ) : null}

            {simResult ? (
              <div
                aria-live="polite"
                className="space-y-2 rounded-[var(--radius-lg)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 p-4 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      simResult.response.decision === "allow"
                        ? "bg-[var(--color-success-muted)] text-[var(--color-success-foreground)]"
                        : "bg-[var(--color-danger-muted)] text-[var(--color-danger-foreground)]"
                    }`}
                  >
                    {simResult.response.decision.toUpperCase()}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      simResult.mode === "control_plane"
                        ? "bg-[var(--color-primary-muted)] text-[var(--color-primary)]"
                        : "bg-[var(--color-warning-muted)] text-[var(--color-warning-foreground)]"
                    }`}
                  >
                    {simResult.mode === "control_plane"
                      ? zh
                        ? "控制面裁决"
                        : "Control-plane verdict"
                      : zh
                        ? "本地草稿预演"
                        : "Local draft preview"}
                  </span>
                  <span className="font-mono text-xs text-[var(--color-text-muted)]">
                    Rev #{simResult.response.revision}
                  </span>
                </div>

                {simResult.fallbackNote ? (
                  <p className="text-xs text-[var(--color-text-subtle)]">
                    {simResult.fallbackNote}
                  </p>
                ) : null}

                <div className="grid gap-2 text-xs text-[var(--color-text-subtle)] sm:grid-cols-2">
                  <div>
                    <strong className="text-[var(--color-heading)]">
                      {zh ? "命中规则" : "Matched rule"}:
                    </strong>{" "}
                    {simResult.response.matched_rule_id ? (
                      <code>
                        {simResult.response.matched_rule_id}
                        {typeof simResult.response.matched_rule_index ===
                        "number"
                          ? ` (#${simResult.response.matched_rule_index + 1})`
                          : ""}
                      </code>
                    ) : (
                      <span>
                        {zh
                          ? `未命中规则 · 默认策略 (${simResult.response.default_action})`
                          : `No rule matched · default_action (${simResult.response.default_action})`}
                      </span>
                    )}
                  </div>
                  <div>
                    <strong className="text-[var(--color-heading)]">
                      {zh ? "裁决说明" : "Reason"}:
                    </strong>{" "}
                    <span>{simResult.response.reason}</span>
                  </div>
                  <div>
                    <strong className="text-[var(--color-heading)]">
                      {zh ? "源节点解析 IP" : "Resolved source IP"}:
                    </strong>{" "}
                    <code>
                      {deviceLookup.get(simResult.request.source_device_id)
                        ?.name || simResult.request.source_device_id}{" "}
                      · {simResult.response.source_address || "—"}
                    </code>
                  </div>
                  <div>
                    <strong className="text-[var(--color-heading)]">
                      {zh ? "目标节点解析 IP" : "Resolved destination IP"}:
                    </strong>{" "}
                    <code>
                      {deviceLookup.get(simResult.request.destination_device_id)
                        ?.name || simResult.request.destination_device_id}{" "}
                      · {simResult.response.destination_address || "—"}
                    </code>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
