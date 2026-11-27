export type OAuthPopupCompletionMessage = {
  type: "connector-oauth-complete";
  connectorId: string;
  ok: boolean;
  account?: string;
  error?: string;
};

export type AuthorizePopupOutcome =
  | { ok: true; account?: string; redirected?: boolean }
  | { ok: false; cancelled?: boolean; error?: string };

export function openOAuthPopupWindow(title = "Google OAuth2"): Window | null {
  if (typeof window === "undefined" || typeof window.open !== "function") {
    return null;
  }

  const width = 560;
  const height = 680;
  const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth || 1024;
  const viewportHeight =
    window.innerHeight || document.documentElement.clientHeight || 768;
  const left = Math.max(0, Math.round(dualScreenLeft + (viewportWidth - width) / 2));
  const top = Math.max(0, Math.round(dualScreenTop + (viewportHeight - height) / 2));

  const popup = window.open(
    "about:blank",
    `connector-oauth-${Date.now()}`,
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );

  if (popup) {
    try {
      popup.document.title = title;
      popup.document.body.innerHTML =
        '<div style="font-family:sans-serif;display:grid;place-items:center;min-height:90vh;color:#334155;font-size:14px;">正在连接 Google OAuth2 安全授权…</div>';
    } catch {
      // Ignore cross-window document write issues.
    }
  }

  return popup;
}

export async function authorizeConnectorWithPopup(params: {
  connectorId: string;
  body?: Record<string, unknown>;
  popup?: Window | null;
}): Promise<AuthorizePopupOutcome> {
  const popup =
    params.popup !== undefined
      ? params.popup
      : openOAuthPopupWindow(`连接 ${params.connectorId}`);

  const response = await fetch(
    `/api/connectors/${encodeURIComponent(params.connectorId)}/authorize`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(params.body ?? {}),
        mode: popup ? "popup" : "redirect",
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    authorizationUrl?: string;
    message?: string;
  };

  if (!response.ok || !payload.authorizationUrl) {
    if (popup && !popup.closed) {
      try {
        popup.close();
      } catch {
        // ignore close failure
      }
    }
    return {
      ok: false,
      error: payload.message || "无法发起 Google OAuth2 授权。",
    };
  }

  if (!popup) {
    window.location.assign(payload.authorizationUrl);
    return { ok: true, redirected: true };
  }

  try {
    popup.location.href = payload.authorizationUrl;
    popup.focus?.();
  } catch {
    try {
      popup.close();
    } catch {
      // ignore
    }
    window.location.assign(payload.authorizationUrl);
    return { ok: true, redirected: true };
  }

  return new Promise<AuthorizePopupOutcome>((resolve) => {
    let settled = false;
    let pollTimer: number | undefined;
    let graceTimer: number | undefined;
    let channel: BroadcastChannel | null = null;

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (channel) {
        try {
          channel.close();
        } catch {
          // ignore
        }
        channel = null;
      }
      if (pollTimer !== undefined) {
        window.clearInterval(pollTimer);
      }
      if (graceTimer !== undefined) {
        window.clearTimeout(graceTimer);
      }
    };

    const finish = (outcome: AuthorizePopupOutcome) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(outcome);
    };

    const handlePayload = (data: unknown) => {
      if (!data || typeof data !== "object") return;
      const msg = data as Partial<OAuthPopupCompletionMessage>;
      if (
        msg.type !== "connector-oauth-complete" ||
        msg.connectorId !== params.connectorId
      ) {
        return;
      }
      if (!popup.closed) {
        try {
          popup.close();
        } catch {
          // ignore
        }
      }
      if (msg.ok) {
        finish({ ok: true, account: msg.account });
      } else {
        finish({ ok: false, error: msg.error || "授权未能完成。" });
      }
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      handlePayload(event.data);
    };

    window.addEventListener("message", onMessage);

    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel("connector-oauth");
        channel.onmessage = (event) => handlePayload(event.data);
      } catch {
        channel = null;
      }
    }

    pollTimer = window.setInterval(() => {
      if (popup.closed && !settled && graceTimer === undefined) {
        graceTimer = window.setTimeout(() => {
          finish({
            ok: false,
            cancelled: true,
            error: "已关闭授权窗口，未完成连接。",
          });
        }, 150);
      }
    }, 500);
  });
}
