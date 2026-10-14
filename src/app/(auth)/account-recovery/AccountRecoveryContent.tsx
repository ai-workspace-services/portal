"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasRequested, setHasRequested] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecovered, setIsRecovered] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const submitting = useRef(false);
  const [alert, setAlert] = useState<AlertState | null>(null);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(
      () => setResendSeconds(resendSeconds - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  useEffect(() => {
    if (!isRecovered) return;
    const timer = window.setTimeout(
      () => window.location.assign("/login"),
      900,
    );
    return () => window.clearTimeout(timer);
  }, [isRecovered]);

  const copy = zh
    ? {
        badge: "账号恢复",
        title: "恢复您的账号",
        description:
          "输入您账号的登录邮箱。我们会发送一封包含六位验证码的邮件，用于重置密码。",
        email: "登录邮箱",
        emailPlaceholder: "name@example.com",
        send: "发送验证码",
        sending: "正在发送…",
        sent: "如果该邮箱对应有效账号，验证码已发送。请检查收件箱和垃圾邮件，并在 30 分钟内完成重置。",
        code: "六位验证码",
        codePlaceholder: "输入邮件中的六位数字验证码",
        newPassword: "新密码",
        newPasswordPlaceholder: "至少 8 位",
        confirmPassword: "确认新密码",
        confirmPasswordPlaceholder: "再次输入新密码",
        complete: "完成恢复",
        completing: "正在恢复…",
        success: "密码已重置，请使用新密码登录。",
        invalidEmail: "请输入有效的登录邮箱。",
        missingCode: "请输入邮件中的六位验证码。",
        shortPassword: "新密码至少需要 8 位。",
        mismatch: "两次输入的新密码不一致。",
        genericError: "暂时无法发起账号恢复，请稍后再试。",
        resetError: "暂时无法重置密码，请检查验证码后重试。",
        expiredCode: "验证码已过期，请重新获取验证码。",
        rateLimited: "请求过于频繁，请稍后再试。",
        resend: "重新获取验证码",
        back: "返回登录",
        switchText: "想起密码了？",
        switchLink: "返回登录",
        bottomNote: "验证码只会发送到已验证的账号邮箱。",
      }
    : {
        badge: "Account recovery",
        title: "Recover your account",
        description:
          "Enter your account email. We will send a six-digit code to help you reset your password.",
        email: "Login email",
        emailPlaceholder: "name@example.com",
        send: "Send verification code",
        sending: "Sending…",
        sent: "If an account matches this address, a code has been sent. Check your inbox and spam folder, then finish within 30 minutes.",
        code: "Six-digit code",
        codePlaceholder: "Enter the six-digit code from your email",
        newPassword: "New password",
        newPasswordPlaceholder: "At least 8 characters",
        confirmPassword: "Confirm new password",
        confirmPasswordPlaceholder: "Enter the new password again",
        complete: "Complete recovery",
        completing: "Recovering…",
        success: "Password reset. Sign in with your new password.",
        invalidEmail: "Enter a valid login email.",
        missingCode: "Enter the six-digit code from your email.",
        shortPassword: "The new password must be at least 8 characters.",
        mismatch: "The new passwords do not match.",
        genericError: "We could not start account recovery. Try again later.",
        resetError:
          "We could not reset your password. Check the code and try again.",
        expiredCode: "This code has expired. Request a new code to continue.",
        rateLimited: "Too many attempts. Please try again later.",
        resend: "Request a new code",
        back: "Back to sign in",
        switchText: "Remember your password?",
        switchLink: "Back to sign in",
        bottomNote: "Codes are sent only to a verified account address.",
      };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || resendSeconds > 0 || isRecovered) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setAlert({ type: "error", message: copy.invalidEmail });
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    setAlert(null);
    try {
      const response = await fetch("/api/auth/password/forgot/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          setAlert({ type: "error", message: copy.rateLimited });
          return;
        }
        throw new Error("recovery_request_failed");
      }
      setEmail(normalizedEmail);
      setHasRequested(true);
      setResendSeconds(60);
      setAlert({ type: "success", message: copy.sent });
    } catch {
      setAlert({ type: "error", message: copy.genericError });
    } finally {
      submitting.current = false;
      setIsSubmitting(false);
    }
  };

  const submitReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting.current || isRecovered) return;
    const normalizedPassword = password.trim();
    if (!/^\d{6}$/.test(code.trim())) {
      setAlert({ type: "error", message: copy.missingCode });
      return;
    }
    if (normalizedPassword.length < 8) {
      setAlert({ type: "error", message: copy.shortPassword });
      return;
    }
    if (password !== confirmPassword) {
      setAlert({ type: "error", message: copy.mismatch });
      return;
    }

    submitting.current = true;
    setIsSubmitting(true);
    setAlert(null);
    try {
      const response = await fetch("/api/auth/password/forgot/confirm-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          password: normalizedPassword,
        }),
      });
      if (!response.ok) {
        if (response.status === 429) {
          setAlert({ type: "error", message: copy.rateLimited });
          return;
        }
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        if (data.error === "code_expired") {
          setAlert({ type: "error", message: copy.expiredCode });
          return;
        }
        throw new Error("recovery_confirm_failed");
      }
      setIsRecovered(true);
      setCode("");
      setPassword("");
      setConfirmPassword("");
      setAlert({ type: "success", message: copy.success });
    } catch {
      setAlert({ type: "error", message: copy.resetError });
    } finally {
      submitting.current = false;
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
            disabled={isSubmitting || resendSeconds > 0}
            aria-busy={isSubmitting}
            className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS}`}
          >
            {isSubmitting ? copy.sending : copy.send}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            {copy.email}: {email}
          </p>
          <form className="space-y-5" onSubmit={submitReset} noValidate>
            <div className="space-y-2">
              <label
                htmlFor="account-recovery-code"
                className="text-sm font-medium text-slate-600"
              >
                {copy.code}
              </label>
              <input
                id="account-recovery-code"
                name="code"
                type="text"
                autoComplete="one-time-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                disabled={isSubmitting || isRecovered}
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder={copy.codePlaceholder}
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
                disabled={isSubmitting || isRecovered}
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
                disabled={isSubmitting || isRecovered}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={copy.confirmPasswordPlaceholder}
                className={AUTH_INPUT_CLASS}
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || isRecovered}
              aria-busy={isSubmitting}
              className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS}`}
            >
              {isSubmitting ? copy.completing : copy.complete}
            </button>
          </form>
          <div className="flex items-center justify-between gap-4 text-sm">
            <button
              type="button"
              disabled={isSubmitting || isRecovered || resendSeconds > 0}
              className={`${AUTH_TEXT_LINK_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={() => {
                setHasRequested(false);
                setCode("");
                setPassword("");
                setConfirmPassword("");
                setAlert(null);
              }}
            >
              {copy.resend}
              {resendSeconds > 0 ? ` (${resendSeconds}s)` : ""}
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
