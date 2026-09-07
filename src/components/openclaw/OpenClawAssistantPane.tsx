"use client";

import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import DOMPurify from "dompurify";
import html2canvas from "html2canvas";
import { marked } from "marked";
import {
  Bot,
  BrainCircuit,
  Camera,
  ChevronRight,
  Link2,
  Loader2,
  Paperclip,
  RefreshCw,
  SendHorizonal,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/i18n/LanguageProvider";
import { cn } from "@/lib/utils";
import {
  makeAgentSessionKey,
  type AssistantMode,
  type GatewayAgentSummary,
  type GatewayChatAttachmentPayload,
  type GatewayChatMessage,
  type GatewaySessionSummary,
  type GatewayTokenSource,
  type IntegrationDefaults,
  type OpenClawBootstrapResponse,
  type OpenClawStreamEvent,
  type ThinkingLevel,
} from "@/lib/openclaw/types";
import { useUserStore } from "@/lib/userStore";
import { useOpenClawConsoleStore } from "@/state/openclawConsoleStore";

type OpenClawAssistantPaneProps = {
  defaults: IntegrationDefaults;
  initialQuestion?: string;
  initialQuestionKey?: number;
  initialSessionKey?: string;
  autoSubmitInitialQuestion?: boolean;
  variant?: "page" | "sidebar";
  showConversation?: boolean;
  emptyConversationHint?: string;
  integrationsHref?: string;
  onStateChange?: (state: OpenClawAssistantViewState) => void;
};

type ComposerAttachment = GatewayChatAttachmentPayload & {
  id: string;
  size: number;
  previewUrl?: string;
};

type ConnectionState = "idle" | "connecting" | "ready" | "error";

type AssistantApiErrorPayload = {
  error?: string;
  code?: string;
  details?: Record<string, unknown> | null;
  deviceId?: string;
};

type ConnectGatewayOptions = {
  force?: boolean;
};

type PersistedPairingRequiredState = {
  signature: string;
  errorMessage: string;
  scope: string;
  savedAtMs: number;
  ttlMs: number;
};

type PersistedPairingRequiredLookup = {
  state: PersistedPairingRequiredState | null;
  expired: boolean;
};

const PAIRING_REQUIRED_SESSION_STORAGE_KEY = "openclaw:pairing-required-state";
const PAIRING_REQUIRED_STATE_TTL_MS = 1000 * 60 * 60 * 12;

export type OpenClawAssistantViewState = {
  connectionState: ConnectionState;
  healthBadge: string;
  errorMessage: string;
  hasGateway: boolean;
  selectedSessionLabel: string;
  streamingText: string;
  streamingHtml: string;
  messages: Array<{
    id: string;
    role: string;
    text: string;
    html: string;
    timestampMs?: number;
  }>;
};

function pickCopy(isChinese: boolean, zh: string, en: string): string {
  return isChinese ? zh : en;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function formatAssistantApiError(params: {
  payload: AssistantApiErrorPayload;
  isChinese: boolean;
  fallback: string;
}): string {
  const message = params.payload.error?.trim();
  if (params.payload.code !== "PAIRING_REQUIRED") {
    return message || params.fallback;
  }

  const details = asRecord(params.payload.details);
  const requestId = stringValue(details.requestId);
  const deviceId =
    params.payload.deviceId?.trim() || stringValue(details.deviceId);
  const reason = stringValue(details.reason);

  return [
    pickCopy(
      params.isChinese,
      "等待管理员审批当前设备后，X 助手才能继续连接。",
      "Waiting for an administrator to approve this device before X Assistant can continue.",
    ),
    deviceId ? `deviceId: ${deviceId}` : "",
    requestId ? `requestId: ${requestId}` : "",
    reason ? `reason: ${reason}` : "",
    message && message !== params.fallback ? message : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildPairingRequiredSignature(
  payload: AssistantApiErrorPayload,
): string | null {
  if (payload.code !== "PAIRING_REQUIRED") {
    return null;
  }

  const details = asRecord(payload.details);
  const requestId = stringValue(details.requestId) ?? "";
  const deviceId =
    payload.deviceId?.trim() || stringValue(details.deviceId) || "";
  const reason = stringValue(details.reason) ?? "";
  return `${deviceId}::${requestId}::${reason}`;
}

function buildPairingPersistenceScope(params: {
  openclawUrl: string;
  openclawOrigin: string;
  userId: string;
}): string {
  return `${params.userId.trim()}::${params.openclawUrl.trim()}::${params.openclawOrigin.trim()}`;
}

function inspectPersistedPairingRequiredState(
  scope: string,
): PersistedPairingRequiredLookup {
  if (typeof window === "undefined") {
    return { state: null, expired: false };
  }

  try {
    const raw = window.sessionStorage.getItem(
      PAIRING_REQUIRED_SESSION_STORAGE_KEY,
    );
    if (!raw) {
      return { state: null, expired: false };
    }

    const parsed = JSON.parse(raw) as PersistedPairingRequiredState;
    if (
      !parsed ||
      typeof parsed.signature !== "string" ||
      typeof parsed.errorMessage !== "string" ||
      typeof parsed.scope !== "string" ||
      typeof parsed.savedAtMs !== "number"
    ) {
      window.sessionStorage.removeItem(PAIRING_REQUIRED_SESSION_STORAGE_KEY);
      return { state: null, expired: false };
    }

    const ttlMs =
      typeof parsed.ttlMs === "number" && Number.isFinite(parsed.ttlMs)
        ? parsed.ttlMs
        : PAIRING_REQUIRED_STATE_TTL_MS;

    const isExpired = Date.now() - parsed.savedAtMs > ttlMs;

    if (parsed.scope !== scope) {
      window.sessionStorage.removeItem(PAIRING_REQUIRED_SESSION_STORAGE_KEY);
      return { state: null, expired: false };
    }

    if (isExpired) {
      window.sessionStorage.removeItem(PAIRING_REQUIRED_SESSION_STORAGE_KEY);
      return { state: null, expired: true };
    }

    return {
      state: {
        ...parsed,
        ttlMs,
      },
      expired: false,
    };
  } catch {
    return { state: null, expired: false };
  }
}

function persistPairingRequiredState(
  state: PersistedPairingRequiredState,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      PAIRING_REQUIRED_SESSION_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Ignore unavailable storage.
  }
}

function clearPersistedPairingRequiredState(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(PAIRING_REQUIRED_SESSION_STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

function renderMarkdown(value: string): string {
  return DOMPurify.sanitize(marked.parse(value) as string);
}

function randomId(): string {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return window.btoa(binary);
}

function formatTimestamp(value: number | undefined, locale: string): string {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function composePrompt(params: {
  isChinese: boolean;
  mode: "ask" | "craft" | "plan";
  prompt: string;
  attachments: ComposerAttachment[];
}): string {
  const attachmentBlock = params.attachments.length
    ? params.isChinese
      ? `附件：\n${params.attachments.map((item) => `- ${item.fileName}`).join("\n")}\n\n`
      : `Attached files:\n${params.attachments.map((item) => `- ${item.fileName}`).join("\n")}\n\n`
    : "";

  switch (params.mode) {
    case "craft":
      return params.isChinese
        ? `${attachmentBlock}请为这个请求生成一份清晰、完整、可直接使用的结果：\n${params.prompt}`
        : `${attachmentBlock}Craft a polished result for this request:\n${params.prompt}`;
    case "plan":
      return params.isChinese
        ? `${attachmentBlock}请为这个任务生成一份清晰的执行计划：\n${params.prompt}`
        : `${attachmentBlock}Create a clear execution plan for this task:\n${params.prompt}`;
    default:
      return `${attachmentBlock}${params.prompt}`;
  }
}

function pickAutoAgent(
  agents: GatewayAgentSummary[],
  prompt: string,
): GatewayAgentSummary | undefined {
  const input = prompt.toLowerCase();

  const findByName = (name: string) =>
    agents.find(
      (agent) =>
        agent.name.toLowerCase().includes(name) ||
        agent.id.toLowerCase().includes(name),
    );

  if (
    input.includes("browser") ||
    input.includes("website") ||
    input.includes("网页") ||
    input.includes("抓取")
  ) {
    return findByName("browser");
  }

  if (
    input.includes("research") ||
    input.includes("analysis") ||
    input.includes("compare") ||
    input.includes("分析") ||
    input.includes("调研")
  ) {
    return findByName("research");
  }

  if (
    input.includes("code") ||
    input.includes("deploy") ||
    input.includes("log") ||
    input.includes("bug") ||
    input.includes("代码") ||
    input.includes("部署") ||
    input.includes("日志")
  ) {
    return findByName("coding");
  }

  return (
    findByName("coding") ?? findByName("research") ?? findByName("browser")
  );
}

async function fileToAttachment(file: File): Promise<ComposerAttachment> {
  const arrayBuffer = await file.arrayBuffer();
  const content = arrayBufferToBase64(arrayBuffer);

  return {
    id: randomId(),
    type: file.type.startsWith("image/") ? "image" : "file",
    mimeType: file.type || "application/octet-stream",
    fileName: file.name,
    content,
    size: file.size,
    previewUrl: file.type.startsWith("image/")
      ? URL.createObjectURL(file)
      : undefined,
  };
}

export function OpenClawAssistantPane({
  defaults,
  initialQuestion,
  initialQuestionKey,
  initialSessionKey,
  autoSubmitInitialQuestion = true,
  variant = "page",
  showConversation = true,
  emptyConversationHint,
  integrationsHref = "/panel/api",
  onStateChange,
}: OpenClawAssistantPaneProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const isChinese = language === "zh";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const bootstrappedRef = useRef(false);
  const lastPrefillQuestionKeyRef = useRef<number | null>(null);
  const pendingAutoSubmitQuestionKeyRef = useRef<number | null>(null);
  const lastPairingRequiredSignatureRef = useRef<string | null>(null);
  const lastConnectPairingSignatureRef = useRef<string | null>(null);

  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [gatewayStatus, setGatewayStatus] = useState<Record<string, unknown>>(
    {},
  );
  const [gatewayHealth, setGatewayHealth] = useState<Record<string, unknown>>(
    {},
  );
  const [gatewayTokenSource, setGatewayTokenSource] =
    useState<GatewayTokenSource>("none");
  const [mainSessionKey, setMainSessionKey] = useState("main");
  const [messages, setMessages] = useState<GatewayChatMessage[]>([]);
  const [sessions, setSessions] = useState<GatewaySessionSummary[]>([]);
  const [agents, setAgents] = useState<GatewayAgentSummary[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [composerValue, setComposerValue] = useState(initialQuestion ?? "");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const defaultsLoaded = useOpenClawConsoleStore(
    (state) => state.defaultsLoaded,
  );
  const applyDefaults = useOpenClawConsoleStore((state) => state.applyDefaults);
  const openclawUrl = useOpenClawConsoleStore((state) => state.openclawUrl);
  const openclawOrigin = useOpenClawConsoleStore(
    (state) => state.openclawOrigin,
  );
  const openclawToken = useOpenClawConsoleStore((state) => state.openclawToken);
  const vaultUrl = useOpenClawConsoleStore((state) => state.vaultUrl);
  const vaultNamespace = useOpenClawConsoleStore(
    (state) => state.vaultNamespace,
  );
  const vaultToken = useOpenClawConsoleStore((state) => state.vaultToken);
  const vaultSecretPath = useOpenClawConsoleStore(
    (state) => state.vaultSecretPath,
  );
  const vaultSecretKey = useOpenClawConsoleStore(
    (state) => state.vaultSecretKey,
  );
  const assistantMode = useOpenClawConsoleStore((state) => state.assistantMode);
  const thinking = useOpenClawConsoleStore((state) => state.thinking);
  const selectedAgentId = useOpenClawConsoleStore(
    (state) => state.selectedAgentId,
  );
  const selectedSessionKey = useOpenClawConsoleStore(
    (state) => state.selectedSessionKey,
  );
  const setAssistantMode = useOpenClawConsoleStore(
    (state) => state.setAssistantMode,
  );
  const setThinking = useOpenClawConsoleStore((state) => state.setThinking);
  const setSelectedAgentId = useOpenClawConsoleStore(
    (state) => state.setSelectedAgentId,
  );
  const setSelectedSessionKey = useOpenClawConsoleStore(
    (state) => state.setSelectedSessionKey,
  );
  const sessionUser = useUserStore((state) => state.user);

  const compact = variant === "sidebar";
  const minimalPage = variant === "page";
  const pairingPersistenceUserId =
    sessionUser?.uuid?.trim() || sessionUser?.id?.trim() || "anonymous";
  const pairingPersistenceTtlMs = PAIRING_REQUIRED_STATE_TTL_MS;
  const pairingPersistenceScope = buildPairingPersistenceScope({
    openclawUrl,
    openclawOrigin,
    userId: pairingPersistenceUserId,
  });
  const locale = isChinese ? "zh-CN" : "en-US";
  const compactConnected = compact && connectionState === "ready";
  const showMinimalAgentSelect =
    !minimalPage || agents.length > 1 || Boolean(selectedAgentId);
  const showTopBar =
    !minimalPage || showMinimalAgentSelect || connectionState !== "ready";

  const quickActions = useMemo(
    () =>
      isChinese
        ? ["写代码", "分析日志", "梳理方案", "排查部署", "生成步骤"]
        : [
            "Write code",
            "Analyze logs",
            "Outline a plan",
            "Debug deployment",
            "Generate steps",
          ],
    [isChinese],
  );
  const thinkingOptions = useMemo(
    (): Array<{ value: ThinkingLevel; label: string }> => [
      { value: "low", label: pickCopy(isChinese, "低", "Low") },
      { value: "medium", label: pickCopy(isChinese, "中", "Medium") },
      { value: "high", label: pickCopy(isChinese, "高", "High") },
      { value: "max", label: pickCopy(isChinese, "最高", "Max") },
    ],
    [isChinese],
  );
  const modeOptions = useMemo(
    (): Array<{ value: AssistantMode; label: string }> => [
      { value: "ask", label: pickCopy(isChinese, "提问", "Ask") },
      { value: "craft", label: pickCopy(isChinese, "生成", "Craft") },
      { value: "plan", label: pickCopy(isChinese, "规划", "Plan") },
    ],
    [isChinese],
  );
  const copy = useMemo(
    () => ({
      serverMissing: pickCopy(
        isChinese,
        "未配置 OpenClaw gateway 地址，请先到接口集成页面填写。",
        "OpenClaw gateway is not configured yet. Fill it in from Integrations first.",
      ),
      bootstrapFailed: pickCopy(
        isChinese,
        "助手初始化失败。",
        "Failed to bootstrap assistant.",
      ),
      connectFailed: pickCopy(
        isChinese,
        "连接 OpenClaw gateway 失败。",
        "Failed to connect to OpenClaw gateway.",
      ),
      captureFailed: pickCopy(
        isChinese,
        "截图生成失败。",
        "Failed to capture screenshot.",
      ),
      attachedFallback: pickCopy(isChinese, "见附件。", "See attached."),
      sendFailed: pickCopy(
        isChinese,
        "发送消息失败。",
        "Failed to send message.",
      ),
      envToken: pickCopy(isChinese, "环境变量令牌", "env token"),
      sessionToken: pickCopy(isChinese, "会话令牌", "session token"),
      vaultToken: pickCopy(isChinese, "Vault 令牌", "vault token"),
      noToken: pickCopy(isChinese, "无令牌", "no token"),
      mainAgent: pickCopy(isChinese, "主助手", "Main agent"),
      reconnect: pickCopy(isChinese, "重新连接", "Reconnect"),
      integrations: pickCopy(isChinese, "接口集成", "Integrations"),
      configureGateway: pickCopy(
        isChinese,
        "配置 OpenClaw gateway",
        "Configure OpenClaw gateway",
      ),
      configureGatewayHint: pickCopy(
        isChinese,
        "当前没有可用的 OpenClaw 地址。先到融合设置填写 gateway / vault / APISIX，再回来启动 XWorkmate。",
        "No OpenClaw endpoint is available yet. Configure gateway, vault, and APISIX first, then return to XWorkmate.",
      ),
      openIntegrations: pickCopy(
        isChinese,
        "打开接口集成",
        "Open integrations",
      ),
      assistantTitle: pickCopy(
        isChinese,
        "XWorkmate 助手",
        "XWorkmate Assistant",
      ),
      assistantHint: pickCopy(
        isChinese,
        "侧栏模式与主页布局保持不变，消息会通过 OpenClaw gateway 进入 XWorkmate。你可以上传文件、贴图，或直接截当前页给助手分析。",
        "The page and sidebar layout stay aligned. Messages flow through the OpenClaw gateway into XWorkmate. Upload files, paste images, or capture the current page for analysis.",
      ),
      compactHint: pickCopy(
        isChinese,
        "直接开始对话，必要时再补充附件或截图。",
        "Start the conversation and add files or a screenshot only when needed.",
      ),
      placeholder: pickCopy(
        isChinese,
        "向 XWorkmate 助手描述任务，或先截个图再发。",
        "Describe the task for XWorkmate, or capture a screenshot before sending.",
      ),
      attachment: pickCopy(isChinese, "附件", "Attach"),
      capturePage: pickCopy(isChinese, "当前页截图", "Capture page"),
      send: pickCopy(isChinese, "发送", "Send"),
      mainSession: pickCopy(isChinese, "主会话", "main"),
      online: pickCopy(isChinese, "在线", "online"),
      connecting: pickCopy(isChinese, "连接中", "connecting"),
      error: pickCopy(isChinese, "错误", "error"),
      offline: pickCopy(isChinese, "离线", "offline"),
    }),
    [isChinese],
  );

  useEffect(() => {
    applyDefaults(defaults);
  }, [applyDefaults, defaults]);

  useEffect(() => {
    if (!initialSessionKey?.trim()) {
      return;
    }
    setSelectedSessionKey(initialSessionKey.trim());
  }, [initialSessionKey, setSelectedSessionKey]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.key === selectedSessionKey),
    [selectedSessionKey, sessions],
  );

  const healthBadge = useMemo(() => {
    const serverHealth = gatewayHealth.status;
    const connectionSummary = gatewayStatus.connection;

    if (typeof serverHealth === "string" && serverHealth.trim().length > 0) {
      return serverHealth;
    }

    if (
      typeof connectionSummary === "string" &&
      connectionSummary.trim().length > 0
    ) {
      return connectionSummary;
    }

    switch (connectionState) {
      case "ready":
        return copy.online;
      case "connecting":
        return copy.connecting;
      case "error":
        return copy.error;
      default:
        return copy.offline;
    }
  }, [
    connectionState,
    copy.connecting,
    copy.error,
    copy.offline,
    copy.online,
    gatewayHealth.status,
    gatewayStatus.connection,
  ]);

  const renderedMessages = useMemo(
    () =>
      messages
        .filter((message) =>
          minimalPage
            ? message.role === "user" || message.role === "assistant"
            : true,
        )
        .map((message) => ({
          ...message,
          html: renderMarkdown(message.text || ""),
        })),
    [messages, minimalPage],
  );

  useEffect(() => {
    onStateChange?.({
      connectionState,
      healthBadge,
      errorMessage,
      hasGateway: Boolean(openclawUrl.trim()),
      selectedSessionLabel:
        activeSession?.derivedTitle ||
        activeSession?.displayName ||
        selectedSessionKey ||
        copy.mainSession,
      streamingText,
      streamingHtml: streamingText ? renderMarkdown(streamingText) : "",
      messages: renderedMessages,
    });
  }, [
    activeSession,
    connectionState,
    copy.mainSession,
    errorMessage,
    healthBadge,
    onStateChange,
    openclawUrl,
    renderedMessages,
    selectedSessionKey,
    streamingText,
  ]);

  const presentAssistantError = useCallback(
    (payload: AssistantApiErrorPayload, fallback: string) => {
      const signature = buildPairingRequiredSignature(payload);
      const formattedMessage = formatAssistantApiError({
        payload,
        isChinese,
        fallback,
      });

      if (signature) {
        if (lastPairingRequiredSignatureRef.current === signature) {
          return;
        }
        lastPairingRequiredSignatureRef.current = signature;
        persistPairingRequiredState({
          signature,
          errorMessage: formattedMessage,
          scope: pairingPersistenceScope,
          savedAtMs: Date.now(),
          ttlMs: pairingPersistenceTtlMs,
        });
      } else {
        lastPairingRequiredSignatureRef.current = null;
      }

      setErrorMessage(formattedMessage);
    },
    [isChinese, pairingPersistenceScope, pairingPersistenceTtlMs],
  );

  const connectGateway = useCallback(
    async (
      nextSessionKey?: string,
      nextAgentId?: string,
      options?: ConnectGatewayOptions,
    ): Promise<void> => {
      if (!openclawUrl.trim()) {
        setConnectionState("error");
        setErrorMessage(copy.serverMissing);
        return;
      }

      if (!options?.force && lastConnectPairingSignatureRef.current) {
        setConnectionState("error");
        setErrorMessage((current) => current);
        return;
      }

      setConnectionState("connecting");
      setErrorMessage("");

      try {
        const response = await fetch("/api/openclaw/assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "bootstrap",
            gatewayUrl: openclawUrl,
            gatewayOrigin: openclawOrigin,
            gatewayToken: openclawToken,
            vaultUrl,
            vaultNamespace,
            vaultToken,
            vaultSecretPath,
            vaultSecretKey,
            agentId: nextAgentId ?? selectedAgentId,
            sessionKey: nextSessionKey ?? selectedSessionKey,
          }),
        });

        const payload = (await response.json()) as
          | OpenClawBootstrapResponse
          | AssistantApiErrorPayload;

        if (!response.ok || "error" in payload) {
          const signature = buildPairingRequiredSignature(
            payload as AssistantApiErrorPayload,
          );
          lastConnectPairingSignatureRef.current = signature;
          presentAssistantError(
            payload as AssistantApiErrorPayload,
            copy.bootstrapFailed,
          );
          setConnectionState("error");
          return;
        }

        const data = payload as OpenClawBootstrapResponse;
        lastConnectPairingSignatureRef.current = null;
        clearPersistedPairingRequiredState();

        setConnectionState("ready");
        setAgents(data.agents);
        setSessions(data.sessions);
        setMessages(data.messages);
        setGatewayStatus(data.statusPayload);
        setGatewayHealth(data.healthPayload);
        setGatewayTokenSource(data.tokenSource);
        setMainSessionKey(data.mainSessionKey);
        setSelectedSessionKey(data.activeSessionKey);
        setStreamingText("");
      } catch (error) {
        setConnectionState("error");
        setErrorMessage(
          error instanceof Error ? error.message : copy.connectFailed,
        );
      }
    },
    [
      copy.bootstrapFailed,
      copy.connectFailed,
      copy.serverMissing,
      openclawToken,
      openclawOrigin,
      openclawUrl,
      presentAssistantError,
      vaultNamespace,
      vaultSecretKey,
      vaultSecretPath,
      vaultToken,
      vaultUrl,
      selectedAgentId,
      selectedSessionKey,
      setSelectedSessionKey,
    ],
  );

  async function addFiles(files: FileList | File[]): Promise<void> {
    const nextAttachments = await Promise.all(
      Array.from(files).map((file) => fileToAttachment(file)),
    );
    setAttachments((current) => [...current, ...nextAttachments]);
  }

  async function capturePage(): Promise<void> {
    setIsCapturing(true);
    setErrorMessage("");

    try {
      const canvas = await html2canvas(document.body, {
        backgroundColor: null,
        scale: Math.min(window.devicePixelRatio || 1, 2),
        logging: false,
        useCORS: true,
      });

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png", 0.95);
      });

      if (!blob) {
        throw new Error(copy.captureFailed);
      }

      const attachment = await fileToAttachment(
        new File([blob], `console-capture-${Date.now()}.png`, {
          type: "image/png",
        }),
      );

      setAttachments((current) => [...current, attachment]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : copy.captureFailed,
      );
    } finally {
      setIsCapturing(false);
    }
  }

  const sendMessage = useCallback(
    async (promptOverride?: string): Promise<void> => {
      const rawPrompt = (promptOverride ?? composerValue).trim();
      if (!rawPrompt && attachments.length === 0) {
        return;
      }

      const autoAgent = pickAutoAgent(agents, rawPrompt);
      const effectiveAgentId = selectedAgentId || autoAgent?.id || "";
      const effectiveSessionKey =
        selectedSessionKey ||
        makeAgentSessionKey(effectiveAgentId, mainSessionKey);

      const prompt = composePrompt({
        isChinese,
        mode: assistantMode,
        prompt: rawPrompt || copy.attachedFallback,
        attachments,
      });

      setErrorMessage("");
      setIsSending(true);
      setStreamingText("");
      setMessages((current) => [
        ...current,
        {
          id: randomId(),
          role: "user",
          text: rawPrompt || copy.attachedFallback,
          timestampMs: Date.now(),
        },
      ]);
      setComposerValue("");

      if (effectiveAgentId && effectiveAgentId !== selectedAgentId) {
        setSelectedAgentId(effectiveAgentId);
      }

      if (effectiveSessionKey !== selectedSessionKey) {
        setSelectedSessionKey(effectiveSessionKey);
      }

      try {
        const response = await fetch("/api/openclaw/assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "send",
            gatewayUrl: openclawUrl,
            gatewayOrigin: openclawOrigin,
            gatewayToken: openclawToken,
            vaultUrl,
            vaultNamespace,
            vaultToken,
            vaultSecretPath,
            vaultSecretKey,
            agentId: effectiveAgentId,
            sessionKey: effectiveSessionKey,
            message: prompt,
            thinking,
            attachments,
          }),
        });

        if (!response.ok || !response.body) {
          const payload = await response
            .json()
            .catch(
              () => ({ error: copy.sendFailed }) as AssistantApiErrorPayload,
            );
          presentAssistantError(
            payload as AssistantApiErrorPayload,
            copy.sendFailed,
          );
          throw new Error(copy.sendFailed);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              continue;
            }

            const event = JSON.parse(trimmed) as OpenClawStreamEvent;

            if (event.type === "delta") {
              setStreamingText(event.text);
              continue;
            }

            if (event.type === "final") {
              setMessages(event.messages);
              setSessions(event.sessions);
              setStreamingText("");
              setSelectedSessionKey(effectiveSessionKey);
              if (event.errorMessage) {
                setErrorMessage(event.errorMessage);
              }
              continue;
            }

            if (event.type === "error") {
              presentAssistantError(
                {
                  error: event.message,
                  code: event.code,
                  details: event.details ?? null,
                  deviceId: event.deviceId,
                },
                copy.sendFailed,
              );
            }
          }
        }
      } catch (error) {
        if (!(error instanceof Error && error.message === copy.sendFailed)) {
          setErrorMessage(
            error instanceof Error ? error.message : copy.sendFailed,
          );
        }
        setStreamingText("");
      } finally {
        setAttachments([]);
        setIsSending(false);
        textareaRef.current?.focus();
      }
    },
    [
      agents,
      assistantMode,
      attachments,
      copy.attachedFallback,
      copy.sendFailed,
      composerValue,
      isChinese,
      mainSessionKey,
      openclawToken,
      openclawOrigin,
      openclawUrl,
      presentAssistantError,
      vaultNamespace,
      vaultSecretKey,
      vaultSecretPath,
      vaultToken,
      vaultUrl,
      selectedAgentId,
      selectedSessionKey,
      setSelectedAgentId,
      setSelectedSessionKey,
      thinking,
    ],
  );

  useEffect(() => {
    const persisted = inspectPersistedPairingRequiredState(
      pairingPersistenceScope,
    );
    if (persisted.state) {
      lastPairingRequiredSignatureRef.current = persisted.state.signature;
      lastConnectPairingSignatureRef.current = persisted.state.signature;
      setConnectionState("error");
      setErrorMessage(persisted.state.errorMessage);
      lastPairingRequiredSignatureRef.current = null;
    }
  }, [pairingPersistenceScope]);

  useEffect(() => {
    if (!defaultsLoaded || bootstrappedRef.current) {
      return;
    }

    if (!openclawUrl.trim()) {
      return;
    }

    bootstrappedRef.current = true;
    void connectGateway(initialSessionKey?.trim() || undefined);
  }, [
    connectGateway,
    defaultsLoaded,
    initialSessionKey,
    openclawUrl,
  ]);

  useEffect(() => {
    lastConnectPairingSignatureRef.current = null;
    lastPairingRequiredSignatureRef.current = null;
  }, [
    openclawOrigin,
    openclawToken,
    openclawUrl,
    pairingPersistenceUserId,
    vaultNamespace,
    vaultSecretKey,
    vaultSecretPath,
    vaultToken,
    vaultUrl,
  ]);

  useEffect(() => {
    if (!initialQuestion) {
      return;
    }

    const resolvedKey = initialQuestionKey ?? 1;
    if (lastPrefillQuestionKeyRef.current === resolvedKey) {
      return;
    }

    lastPrefillQuestionKeyRef.current = resolvedKey;
    pendingAutoSubmitQuestionKeyRef.current = autoSubmitInitialQuestion
      ? resolvedKey
      : null;
    setComposerValue(initialQuestion);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(
        initialQuestion.length,
        initialQuestion.length,
      );
    });
  }, [autoSubmitInitialQuestion, initialQuestion, initialQuestionKey]);

  useEffect(() => {
    if (
      !autoSubmitInitialQuestion ||
      !initialQuestion ||
      connectionState !== "ready"
    ) {
      return;
    }

    const resolvedKey = initialQuestionKey ?? 1;
    if (pendingAutoSubmitQuestionKeyRef.current !== resolvedKey) {
      return;
    }

    pendingAutoSubmitQuestionKeyRef.current = null;
    void sendMessage(initialQuestion);
  }, [
    autoSubmitInitialQuestion,
    connectionState,
    initialQuestion,
    initialQuestionKey,
    sendMessage,
  ]);

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function handleAttachmentChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    if (!event.target.files?.length) {
      return;
    }
    await addFiles(event.target.files);
    event.target.value = "";
  }

  const containerClassName = cn(
    "flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-md)]",
    compact ? "rounded-none border-0 shadow-none" : "",
  );

  return (
    <div className={containerClassName}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.log,.txt,.md,.json,.yaml,.yml,.pdf"
        multiple
        className="hidden"
        onChange={(event) => {
          void handleAttachmentChange(event);
        }}
      />

      {showTopBar ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2.5 border-b border-[color:var(--color-surface-border)] px-3 py-2.5",
            minimalPage ? "min-h-[52px]" : "",
          )}
        >
          {!minimalPage ? (
            <div className="inline-flex min-h-10 items-center gap-2 rounded-[12px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-medium text-[var(--color-text-subtle)] shadow-[var(--shadow-soft)]">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  connectionState === "ready"
                    ? "bg-emerald-500"
                    : connectionState === "connecting"
                      ? "bg-amber-400"
                      : connectionState === "error"
                        ? "bg-rose-500"
                        : "bg-[var(--color-text-subtle)]/40",
                )}
              />
              {healthBadge}
              {!compactConnected ? (
                <>
                  <span className="text-[var(--color-text-subtle)]/60">·</span>
                  {gatewayTokenSource === "env"
                    ? copy.envToken
                    : gatewayTokenSource === "vault"
                      ? copy.vaultToken
                      : gatewayTokenSource === "request"
                        ? copy.sessionToken
                        : copy.noToken}
                </>
              ) : null}
            </div>
          ) : null}

          {showMinimalAgentSelect ? (
            <div
              className={cn(
                "min-w-[164px] flex-1",
                minimalPage ? "max-w-xl" : "",
              )}
            >
              <select
                value={selectedAgentId}
                onChange={(event) => {
                  setSelectedAgentId(event.target.value);
                  setSelectedSessionKey("");
                  void connectGateway("", event.target.value, { force: true });
                }}
                className="tactile-control min-h-10 w-full px-3 py-2 text-sm text-[var(--color-text)] outline-none transition focus:border-[color:var(--color-primary)]"
              >
                <option value="">{copy.mainAgent}</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.emoji ? `${agent.emoji} ` : ""}
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {minimalPage ? (
            <div className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-[12px] border border-[color:var(--color-surface-border)] bg-[var(--color-primary-muted)] px-3 py-2 text-xs font-semibold text-[var(--color-heading)] shadow-[var(--shadow-soft)]">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full",
                  connectionState === "ready"
                    ? "bg-emerald-500"
                    : connectionState === "connecting"
                      ? "bg-amber-400"
                      : connectionState === "error"
                        ? "bg-rose-500"
                        : "bg-[var(--color-text-subtle)]/40",
                )}
              />
              {healthBadge}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  void connectGateway(undefined, undefined, { force: true });
                }}
                className="tactile-button tactile-button-soft px-3 text-xs text-[var(--color-text)]"
                title={copy.reconnect}
              >
                {connectionState === "connecting" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {!compactConnected ? copy.reconnect : null}
              </button>

              <button
                type="button"
                onClick={() => router.push(integrationsHref)}
                className="tactile-button tactile-button-primary border border-[color:var(--color-primary-border)] px-3 text-xs text-[var(--color-primary-foreground)]"
                title={copy.integrations}
              >
                <Settings2 className="h-3.5 w-3.5" />
                {!compactConnected ? copy.integrations : null}
              </button>
            </>
          )}
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          compact && "grid grid-rows-[minmax(0,1fr)_auto]",
        )}
      >
        {!compact && !minimalPage ? (
          <div className="border-b border-[color:var(--color-surface-border)] px-3 py-2.5">
            <div className="flex flex-wrap gap-2">
              {sessions.slice(0, 8).map((session) => (
                <button
                  key={session.key}
                  type="button"
                  onClick={() => {
                    setSelectedSessionKey(session.key);
                    void connectGateway(session.key, undefined, {
                      force: true,
                    });
                  }}
                  className={cn(
                    "inline-flex min-h-9 items-center gap-2 rounded-[12px] border px-3 py-1.5 text-xs transition",
                    session.key === selectedSessionKey
                      ? "border-[color:var(--color-primary)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]"
                      : "border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text-subtle)] hover:border-[color:var(--color-primary-border)]",
                  )}
                >
                  <Bot className="h-3.5 w-3.5" />
                  <span>
                    {session.derivedTitle || session.displayName || session.key}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "flex-1 overflow-y-auto px-3 py-3",
            compact && "min-h-0 overscroll-contain",
          )}
        >
          {!showConversation ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-[var(--color-heading)]">
                  {copy.assistantTitle}
                </h3>
                <p className="text-sm text-[var(--color-text-subtle)]">
                  {emptyConversationHint ??
                    pickCopy(
                      isChinese,
                      "在右侧发起任务，中间区域会同步展示助手结果。",
                      "Start tasks from the right panel. Results will be mirrored in the center workspace.",
                    )}
                </p>
              </div>
            </div>
          ) : !openclawUrl.trim() ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 px-5 text-center">
              <Sparkles className="h-7 w-7 text-[var(--color-primary)]" />
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-[var(--color-heading)]">
                  {copy.configureGateway}
                </h3>
                <p className="text-sm text-[var(--color-text-subtle)]">
                  {copy.configureGatewayHint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(integrationsHref)}
                className="tactile-button tactile-button-primary px-4 text-sm"
              >
                {copy.openIntegrations}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : renderedMessages.length === 0 && !streamingText ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[var(--radius-xl)] border border-dashed border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)]/40 px-5 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--color-primary-muted)] text-[var(--color-primary)]">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-[var(--color-heading)]">
                  {copy.assistantTitle}
                </h3>
                <p className="text-sm text-[var(--color-text-subtle)]">
                  {compact ? copy.compactHint : copy.assistantHint}
                </p>
              </div>
              {!compact && !minimalPage ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => {
                        setComposerValue(action);
                        textareaRef.current?.focus();
                      }}
                      className="tactile-button tactile-button-subtle min-h-9 px-3 text-xs font-medium text-[var(--color-text-subtle)] hover:text-[var(--color-primary)]"
                    >
                      {action}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {renderedMessages.map((message) => {
                const isUser = message.role === "user";
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      isUser ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[84%] rounded-[var(--radius-lg)] px-3 py-2.5 shadow-[var(--shadow-sm)]",
                        isUser
                          ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                          : "border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
                      )}
                    >
                      <div
                        className={cn(
                          "prose prose-sm max-w-none break-words whitespace-pre-wrap",
                          isUser ? "prose-invert" : "",
                        )}
                        dangerouslySetInnerHTML={{ __html: message.html }}
                      />
                      {message.timestampMs && !compact && !minimalPage ? (
                        <p
                          className={cn(
                            "mt-2 text-xs",
                            isUser
                              ? "text-white/70"
                              : "text-[var(--color-text-subtle)]",
                          )}
                        >
                          {formatTimestamp(message.timestampMs, locale)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}

              {streamingText ? (
                <div className="flex justify-start">
                  <div className="max-w-[84%] rounded-[var(--radius-lg)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-2.5 text-[var(--color-text)] shadow-[var(--shadow-sm)]">
                    <div
                      className="prose prose-sm max-w-none break-words whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(streamingText),
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div
          className={cn(
            "border-t border-[color:var(--color-surface-border)] px-3 py-3",
            compact && "shrink-0",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setAssistantMode(option.value)}
                className={cn(
                  "min-h-9 rounded-[12px] px-3 py-1.5 text-xs font-semibold transition",
                  assistantMode === option.value
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                    : "border border-[color:var(--color-surface-border)] text-[var(--color-text-subtle)] hover:border-[color:var(--color-primary-border)]",
                )}
              >
                {option.label}
              </button>
            ))}

            <div className="ml-auto flex min-h-9 items-center gap-2 rounded-[12px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs text-[var(--color-text-subtle)]">
              <BrainCircuit className="h-3.5 w-3.5" />
              <select
                value={thinking}
                onChange={(event) =>
                  setThinking(event.target.value as typeof thinking)
                }
                className="bg-transparent text-xs outline-none"
              >
                {thinkingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {attachments.length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="inline-flex min-h-8 items-center gap-2 rounded-[12px] border border-[color:var(--color-surface-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs text-[var(--color-text)]"
                >
                  {attachment.type === "image" ? (
                    <Camera className="h-3.5 w-3.5" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5" />
                  )}
                  <span>{attachment.fileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachments((current) =>
                        current.filter((item) => item.id !== attachment.id),
                      );
                    }}
                    className="text-[var(--color-text-subtle)] transition hover:text-[var(--color-text)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-2.5 space-y-2">
              <div className="whitespace-pre-wrap rounded-[var(--radius-lg)] border border-[color:var(--color-danger-border)] bg-[var(--color-danger-muted)]/40 px-3 py-2 text-sm text-[var(--color-danger-foreground)]">
                {errorMessage}
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "mt-2.5 flex flex-1 flex-col rounded-[var(--radius-xl)] border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-2.5 shadow-[var(--shadow-sm)]",
              compact ? "min-h-[184px]" : "min-h-[248px]",
            )}
          >
            <textarea
              ref={textareaRef}
              rows={compact ? 2 : 4}
              value={composerValue}
              placeholder={copy.placeholder}
              onChange={(event) => setComposerValue(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              onPaste={(event) => {
                const clipboardFiles = Array.from(event.clipboardData.files);
                if (clipboardFiles.length > 0) {
                  event.preventDefault();
                  void addFiles(clipboardFiles);
                }
              }}
              className={cn(
                "w-full flex-1 resize-none bg-transparent text-sm leading-6 text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]/70",
                compact ? "min-h-[92px]" : "min-h-[148px]",
              )}
            />

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="tactile-button tactile-button-soft min-h-9 px-3 text-xs text-[var(--color-text)]"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {copy.attachment}
              </button>

              <button
                type="button"
                onClick={() => {
                  void capturePage();
                }}
                disabled={isCapturing}
                className="tactile-button tactile-button-soft min-h-9 px-3 text-xs text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCapturing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                {copy.capturePage}
              </button>

              {!compact && !minimalPage ? (
                <div className="ml-auto flex items-center gap-2 text-eyebrow text-[var(--color-text-subtle)]">
                  <Link2 className="h-3.5 w-3.5" />
                  <span>
                    {activeSession?.derivedTitle ||
                      activeSession?.displayName ||
                      selectedSessionKey ||
                      copy.mainSession}
                  </span>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  void sendMessage();
                }}
                disabled={
                  isSending ||
                  (!composerValue.trim() && attachments.length === 0)
                }
                className="tactile-button tactile-button-primary px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4" />
                )}
                {copy.send}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
