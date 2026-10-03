"use client";

import { useEffect, useState } from "react";
import { KeyRound, Mail, ShieldCheck, UserRoundX } from "lucide-react";

import { useLanguage } from "@i18n/LanguageProvider";
import { useUserStore } from "@lib/userStore";

const FREE_GROUP = "segment:quota:free-5gb";

async function readError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  return payload.error ?? payload.message ?? fallback;
}

export default function SelfServiceSecurityPanel() {
  const { language } = useLanguage();
  const zh = language !== "en";
  const user = useUserStore((state) => state.user);
  const refresh = useUserStore((state) => state.refresh);
  const logout = useUserStore((state) => state.logout);
  const [email, setEmail] = useState(user?.email ?? "");
  const [code, setCode] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [managementTotpCode, setManagementTotpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCodeCount, setRecoveryCodeCount] = useState(0);
  const [recoveryCodeExpiry, setRecoveryCodeExpiry] = useState<string | null>(
    null,
  );
  const [password, setPassword] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canCancel = user?.groups?.includes(FREE_GROUP) && !user.isAdmin;

  useEffect(() => {
    if (!user?.mfaEnabled) return;
    let active = true;
    void fetch("/api/auth/mfa/recovery-codes", {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          activeCount?: number;
          expiresAt?: string | null;
        };
      })
      .then((payload) => {
        if (!active || !payload) return;
        setRecoveryCodeCount(payload.activeCount ?? 0);
        setRecoveryCodeExpiry(payload.expiresAt ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.mfaEnabled]);

  const requestEmailCode = async () => {
    if (!email.trim()) return;
    setSendingCode(true);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch("/api/auth/password/forgot/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok)
        throw new Error(
          await readError(
            response,
            zh ? "验证码发送失败" : "Could not send code",
          ),
        );
      setStatus(
        zh ? "验证码已发送，请检查邮箱" : "A reset code was sent to your email",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : zh
            ? "验证码发送失败"
            : "Could not send code",
      );
    } finally {
      setSendingCode(false);
    }
  };

  const resetWithEmailCode = async () => {
    if (code.trim().length !== 6 || password.length < 8) {
      setError(
        zh
          ? "请输入 6 位验证码和至少 8 位新密码"
          : "Enter a 6 digit code and an 8 character password",
      );
      return;
    }
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch("/api/auth/password/forgot/confirm-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          password,
        }),
      });
      if (!response.ok)
        throw new Error(
          await readError(
            response,
            zh ? "密码重置失败" : "Could not reset password",
          ),
        );
      setCode("");
      setPassword("");
      setStatus(zh ? "密码已重置" : "Password reset successfully");
      await refresh();
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : zh
            ? "密码重置失败"
            : "Could not reset password",
      );
    } finally {
      setSaving(false);
    }
  };

  const resetWithMfa = async () => {
    const credential = mfaCode.trim();
    if (!credential || password.length < 8) {
      setError(
        zh
          ? "请输入 MFA 验证码或一次性恢复码，以及至少 8 位新密码"
          : "Enter an MFA or one-time recovery code and a password of at least 8 characters",
      );
      return;
    }
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch("/api/auth/password/reset/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          method: /^\d{6}$/.test(credential) ? "totp" : "recovery_code",
          code: credential,
          password,
        }),
      });
      if (!response.ok)
        throw new Error(
          await readError(
            response,
            zh ? "MFA 重置失败" : "Could not reset with MFA",
          ),
        );
      setMfaCode("");
      setPassword("");
      setStatus(
        zh
          ? "密码已重置，所有会话已注销，请重新登录"
          : "Password reset; all sessions were signed out. Please log in again.",
      );
      await logout();
      window.location.assign("/login?passwordReset=1");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : zh
            ? "MFA 重置失败"
            : "Could not reset with MFA",
      );
    } finally {
      setSaving(false);
    }
  };

  const manageRecoveryCodes = async (action: "rotate" | "revoke") => {
    if (!/^\d{6}$/.test(managementTotpCode.trim())) {
      setError(
        zh
          ? "请输入当前 6 位 MFA 验证码"
          : "Enter the current 6 digit MFA code",
      );
      return;
    }
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch("/api/auth/mfa/recovery-codes", {
        method: action === "rotate" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: managementTotpCode.trim() }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        recoveryCodes?: string[];
        activeCount?: number;
        revokedCount?: number;
        expiresAt?: string;
      };
      if (!response.ok)
        throw new Error(
          payload.error ??
            (zh ? "恢复码操作失败" : "Recovery code operation failed"),
        );
      setManagementTotpCode("");
      setRecoveryCodes(
        action === "rotate" ? (payload.recoveryCodes ?? []) : [],
      );
      setRecoveryCodeCount(
        action === "rotate" ? (payload.recoveryCodes?.length ?? 0) : 0,
      );
      setRecoveryCodeExpiry(
        action === "rotate" ? (payload.expiresAt ?? null) : null,
      );
      setStatus(
        action === "rotate"
          ? zh
            ? "新恢复码只显示这一次，请保存到安全位置"
            : "New recovery codes are shown once. Store them somewhere safe."
          : zh
            ? `已撤销 ${payload.revokedCount ?? 0} 个未使用恢复码`
            : `Revoked ${payload.revokedCount ?? 0} unused recovery codes`,
      );
    } catch (operationError) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : zh
            ? "恢复码操作失败"
            : "Recovery code operation failed",
      );
    } finally {
      setSaving(false);
    }
  };

  const cancelAccount = async () => {
    if (
      !canCancel ||
      !window.confirm(
        zh
          ? "确认注销 Free 账户吗？账户会停用，但记录保留，可由管理员恢复。"
          : "Cancel this Free account? It will be disabled, not deleted, and an administrator can recover it.",
      )
    )
      return;
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      const response = await fetch("/api/auth/account", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok)
        throw new Error(
          await readError(
            response,
            zh ? "注销失败" : "Could not cancel account",
          ),
        );
      await logout();
      window.location.assign("/");
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : zh
            ? "注销失败"
            : "Could not cancel account",
      );
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-[color:var(--color-surface-border)] bg-[var(--color-surface)] p-6">
      <div className="flex items-start gap-3">
        <KeyRound
          className="mt-0.5 h-5 w-5 text-[var(--color-primary)]"
          aria-hidden="true"
        />
        <div>
          <h2 className="font-semibold text-[var(--color-heading)]">
            {zh ? "自助安全操作" : "Self-service security"}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-subtle)]">
            {zh
              ? "可通过邮箱验证码或已启用的 MFA 重置自己的密码。"
              : "Reset your password with an email code or enabled MFA."}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[color:var(--color-surface-border)] p-4">
          <div className="flex items-center gap-2 font-medium text-[var(--color-heading)]">
            <Mail className="h-4 w-4" />
            {zh ? "邮箱验证码" : "Email code"}
          </div>
          <input
            aria-label={zh ? "账户邮箱" : "Account email"}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-3 w-full rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <input
              aria-label={zh ? "邮箱验证码" : "Email reset code"}
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
              placeholder={zh ? "6 位验证码" : "6 digit code"}
              className="min-w-0 flex-1 rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void requestEmailCode()}
              disabled={sendingCode || !email.trim()}
              className="rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm disabled:opacity-50"
            >
              {sendingCode ? "…" : zh ? "发送验证码" : "Send code"}
            </button>
          </div>
          <input
            aria-label={zh ? "邮箱重置新密码" : "New password for email reset"}
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={zh ? "新密码（至少 8 位）" : "New password (8+ chars)"}
            className="mt-2 w-full rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void resetWithEmailCode()}
            disabled={saving}
            className="mt-2 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {zh ? "用邮箱验证码重置" : "Reset with email code"}
          </button>
        </div>
        <div className="rounded-xl border border-[color:var(--color-surface-border)] p-4">
          <div className="flex items-center gap-2 font-medium text-[var(--color-heading)]">
            <ShieldCheck className="h-4 w-4" />
            {zh ? "MFA 验证" : "MFA verification"}
          </div>
          <p className="mt-2 text-xs text-[var(--color-text-subtle)]">
            {zh
              ? "仅已启用 MFA 的账户可使用。"
              : "Available when MFA is enabled."}
          </p>
          <input
            aria-label={zh ? "MFA 验证码" : "MFA code"}
            autoCapitalize="characters"
            maxLength={40}
            value={mfaCode}
            onChange={(event) =>
              setMfaCode(
                event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
              )
            }
            placeholder={
              zh
                ? "6 位 MFA 验证码或一次性恢复码"
                : "6 digit MFA or one-time recovery code"
            }
            disabled={!user?.mfaEnabled}
            className="mt-3 w-full rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm disabled:bg-slate-50"
          />
          <button
            type="button"
            onClick={() => void resetWithMfa()}
            disabled={saving || !user?.mfaEnabled}
            className="mt-2 rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            {zh ? "用 MFA 或恢复码重置密码" : "Reset with MFA or recovery code"}
          </button>
          <p className="mt-3 text-xs text-[var(--color-text-subtle)]">
            {zh
              ? `可用恢复码：${recoveryCodeCount}${recoveryCodeExpiry ? ` · 到期 ${new Date(recoveryCodeExpiry).toLocaleDateString()}` : ""}`
              : `Recovery codes available: ${recoveryCodeCount}${recoveryCodeExpiry ? ` · expires ${new Date(recoveryCodeExpiry).toLocaleDateString()}` : ""}`}
          </p>
          <input
            aria-label={
              zh
                ? "管理恢复码的当前 MFA 验证码"
                : "Current MFA code to manage recovery codes"
            }
            inputMode="numeric"
            maxLength={6}
            value={managementTotpCode}
            onChange={(event) =>
              setManagementTotpCode(event.target.value.replace(/\D/g, ""))
            }
            placeholder={
              zh ? "当前 6 位 MFA 验证码" : "Current 6 digit MFA code"
            }
            disabled={!user?.mfaEnabled}
            className="mt-3 w-full rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm disabled:bg-slate-50"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void manageRecoveryCodes("rotate")}
              disabled={saving || !user?.mfaEnabled}
              className="rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm disabled:opacity-50"
            >
              {zh ? "生成/更换恢复码" : "Generate/replace recovery codes"}
            </button>
            <button
              type="button"
              onClick={() => void manageRecoveryCodes("revoke")}
              disabled={saving || !user?.mfaEnabled || recoveryCodeCount === 0}
              className="rounded-lg border border-[color:var(--color-surface-border)] px-3 py-2 text-sm disabled:opacity-50"
            >
              {zh ? "撤销剩余恢复码" : "Revoke remaining codes"}
            </button>
          </div>
          {recoveryCodes.length > 0 ? (
            <div
              className="mt-3 rounded-lg border border-[color:var(--color-surface-border)] p-3"
              aria-label={zh ? "一次性恢复码" : "One-time recovery codes"}
            >
              <p className="mb-2 text-xs text-[var(--color-text-subtle)]">
                {zh
                  ? "此列表只显示一次。关闭或离开页面后无法再次查看。"
                  : "Shown once only. They cannot be viewed again after leaving this page."}
              </p>
              <ul
                className="grid grid-cols-2 gap-2 font-mono text-sm"
                aria-label={zh ? "恢复码列表" : "Recovery code list"}
              >
                {recoveryCodes.map((recoveryCode) => (
                  <li key={recoveryCode}>{recoveryCode}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      {status ? (
        <p className="mt-4 text-sm text-emerald-700" role="status">
          {status}
        </p>
      ) : null}
      {error ? (
        <p
          className="mt-4 text-sm text-[var(--color-danger-foreground)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {canCancel ? (
        <div className="mt-5 border-t border-[color:var(--color-surface-border)] pt-4">
          <button
            type="button"
            onClick={() => void cancelAccount()}
            disabled={saving}
            className="inline-flex items-center gap-2 text-sm text-red-700 hover:underline disabled:opacity-50"
          >
            <UserRoundX className="h-4 w-4" />
            {zh ? "注销 Free 账户" : "Cancel Free account"}
          </button>
          <p className="mt-1 text-xs text-[var(--color-text-subtle)]">
            {zh
              ? "仅 Free 5GB 用户可自助注销；账户记录保留，不会删除。"
              : "Only Free 5GB users can self-cancel; the account record is retained."}
          </p>
        </div>
      ) : null}
    </section>
  );
}
