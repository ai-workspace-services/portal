"use client";

import { FormEvent, useState } from "react";
import BoundaryLink from "@/components/common/BoundaryLink";

import {
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
  AUTH_TEXT_LINK_CLASS,
  AuthLayout,
} from "@components/auth/AuthLayout";
import { useLanguage } from "@i18n/LanguageProvider";

type AlertState = {
  type: "error" | "success" | "info";
  message: string;
};

export default function AccountRecoveryContent() {
  const { language } = useLanguage();
  const zh = language === "zh";
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasRequested, setHasRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alert, setAlert] = useState<AlertState | null>(null);

  const copy = zh
    ? {
        badge: "账号恢复",
        title: "恢复您的账号",
        description:
          "输入您账号的登录邮箱。我们将发送一封恢复邮件，用来重新设置您的密码。",
        email: "登录邮箱",
        emailPlaceholder: "name@example.com",
        send: "发送恢复链接",
        sending: "正在发送…",
        sent: "如果该邮箱对应有效账号，恢复邮件已发送。请检查收件箱和垃圾邮件；邮件中的恢复令牌将在 30 分钟后失效。",
        token: "恢复令牌",
        tokenPlaceholder: "粘贴邮件中的恢复令牌",
        newPassword: "新密码",
        newPasswordPlaceholder: "至少 8 位",
        confirmPassword: "确认新密码",
        confirmPasswordPlaceholder: "再次输入新密码",
        complete: "完成恢复",
        completing: "正在恢复…",
        success: "密码已重置，请使用新密码登录。",
        invalidEmail: "请输入有效的登录邮箱。",
        missingToken: "请输入邮件中的恢复令牌。",
        shortPassword: "新密码至少需要 8 位。",
        mismatch: "两次输入的新密码不一致。",
        genericError: "暂时无法发起账号恢复，请稍后再试。",
        resetError: "恢复失败，请检查令牌和密码后重试。",
        resend: "重新发送恢复邮件",
        back: "返回登录",
        switchText: "想起密码了？",
        switchLink: "返回登录",
        bottomNote: "恢复邮件只会发送到已验证的账号邮箱。",
      }
    : {
        badge: "Account recovery",
        title: "Recover your account",
        description:
          "Enter your account email. We will send a recovery email to help you set a new password.",
        email: "Login email",
        emailPlaceholder: "name@example.com",
        send: "Send recovery link",
        sending: "Sending…",
        sent: "If an account matches this address, a recovery email has been sent. Check your inbox and spam folder; the recovery token expires in 30 minutes.",
        token: "Recovery token",
        tokenPlaceholder: "Paste the token from the email",
        newPassword: "New password",
        newPasswordPlaceholder: "At least 8 characters",
        confirmPassword: "Confirm new password",
        confirmPasswordPlaceholder: "Enter the new password again",
        complete: "Complete recovery",
        completing: "Recovering…",
        success: "Password reset. Sign in with your new password.",
        invalidEmail: "Enter a valid login email.",
        missingToken: "Enter the recovery token from the email.",
        shortPassword: "The new password must be at least 8 characters.",
        mismatch: "The new passwords do not match.",
        genericError: "We could not start account recovery. Try again later.",
        resetError:
          "Recovery failed. Check the token and password, then try again.",
        resend: "Send recovery email again",
        back: "Back to sign in",
        switchText: "Remember your password?",
        switchLink: "Back to sign in",
        bottomNote:
          "Recovery email is sent only to a verified account address.",
      };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setAlert({ type: "error", message: copy.invalidEmail });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (!response.ok) {
        throw new Error("recovery_request_failed");
      }
      setEmail(normalizedEmail);
      setHasRequested(true);
      setAlert({ type: "success", message: copy.sent });
    } catch {
      setAlert({ type: "error", message: copy.genericError });
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token.trim()) {
      setAlert({ type: "error", message: copy.missingToken });
      return;
    }
    if (password.length < 8) {
      setAlert({ type: "error", message: copy.shortPassword });
      return;
    }
    if (password !== confirmPassword) {
      setAlert({ type: "error", message: copy.mismatch });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);
    try {
      const response = await fetch("/api/auth/password/forgot/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), password }),
      });
      if (!response.ok) {
        throw new Error("recovery_confirm_failed");
      }
      setAlert({ type: "success", message: copy.success });
      setTimeout(() => window.location.assign("/login"), 900);
    } catch {
      setAlert({ type: "error", message: copy.resetError });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      mode="login"
      badge={copy.badge}
      title={copy.title}
      description={copy.description}
      alert={alert}
      switchAction={{
        text: copy.switchText,
        linkLabel: copy.switchLink,
        href: "/login",
      }}
      bottomNote={copy.bottomNote}
    >
      {!hasRequested ? (
        <form className="space-y-5" onSubmit={submitRequest} noValidate>
          <div className="space-y-2">
            <label
              htmlFor="account-recovery-email"
              className="text-sm font-medium text-slate-600"
            >
              {copy.email}
            </label>
            <input
              id="account-recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={copy.emailPlaceholder}
              className={AUTH_INPUT_CLASS}
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS}`}
          >
            {isSubmitting ? copy.sending : copy.send}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <form className="space-y-5" onSubmit={submitReset} noValidate>
            <div className="space-y-2">
              <label
                htmlFor="account-recovery-token"
                className="text-sm font-medium text-slate-600"
              >
                {copy.token}
              </label>
              <input
                id="account-recovery-token"
                name="token"
                type="text"
                autoComplete="one-time-code"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={copy.tokenPlaceholder}
                className={AUTH_INPUT_CLASS}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="account-recovery-password"
                className="text-sm font-medium text-slate-600"
              >
                {copy.newPassword}
              </label>
              <input
                id="account-recovery-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={copy.newPasswordPlaceholder}
                className={AUTH_INPUT_CLASS}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="account-recovery-confirm-password"
                className="text-sm font-medium text-slate-600"
              >
                {copy.confirmPassword}
              </label>
              <input
                id="account-recovery-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={copy.confirmPasswordPlaceholder}
                className={AUTH_INPUT_CLASS}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS}`}
            >
              {isSubmitting ? copy.completing : copy.complete}
            </button>
          </form>
          <div className="flex items-center justify-between gap-4 text-sm">
            <button
              type="button"
              className={AUTH_TEXT_LINK_CLASS}
              onClick={() => {
                setHasRequested(false);
                setToken("");
                setPassword("");
                setConfirmPassword("");
                setAlert(null);
              }}
            >
              {copy.resend}
            </button>
            <BoundaryLink href="/login" className={AUTH_TEXT_LINK_CLASS}>
              {copy.back}
            </BoundaryLink>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
