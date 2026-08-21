"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

import {
  AUTH_CHECKBOX_CLASS,
  AUTH_HINT_PANEL_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
  AUTH_SECONDARY_BUTTON_CLASS,
  AUTH_TEXT_LINK_CLASS,
} from "@components/auth/AuthLayout";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";
import { useUserStore } from "@lib/userStore";

import { codeRequiresMfa, resolveLoginErrorMessage } from "./loginErrors";

export function LoginForm() {
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const pageCopy = translations[language].login;
  const authCopy = translations[language].auth.login;
  const navCopy = translations[language].nav.account;
  const user = useUserStore((state) => state.user);
  const login = useUserStore((state) => state.login);
  const userEmail = user?.email ?? "";
  const [identifier, setIdentifier] = useState(() => userEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaRequirement, setMfaRequirement] = useState<"optional" | "required">(
    () => (user?.mfaEnabled ? "required" : "optional"),
  );

  const targetUrl = useMemo(() => {
    const redirectParam =
      searchParams.get("redirect") ??
      searchParams.get("returnTo") ??
      searchParams.get("redirectTo");
    if (
      redirectParam &&
      redirectParam.startsWith("/") &&
      !redirectParam.startsWith("//")
    ) {
      return redirectParam;
    }
    return "/panel";
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      const timer = window.setTimeout(() => {
        window.location.assign(targetUrl);
      }, 800);
      return () => window.clearTimeout(timer);
    }
  }, [user, targetUrl]);

  useEffect(() => {
    if (userEmail && identifier.trim().length === 0) {
      setIdentifier(userEmail);
    }
  }, [identifier, userEmail]);

  useEffect(() => {
    setTotpCode("");
  }, [identifier]);

  useEffect(() => {
    if (mfaRequirement !== "required" && totpCode !== "") {
      setTotpCode("");
    }
  }, [mfaRequirement, totpCode]);

  useEffect(() => {
    let isActive = true;
    const trimmedIdentifier = identifier.trim();

    if (!trimmedIdentifier) {
      if (isActive) {
        setMfaRequirement("optional");
      }
      return () => {
        isActive = false;
      };
    }

    const normalizedIdentifier = trimmedIdentifier.toLowerCase();

    const controller = new AbortController();
    const signal = controller.signal;

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/auth/mfa/status?identifier=${encodeURIComponent(normalizedIdentifier)}`,
          {
            method: "GET",
            cache: "no-store",
            signal,
          },
        );

        if (!isActive || signal.aborted) {
          return;
        }

        if (!response.ok) {
          setMfaRequirement("optional");
          return;
        }

        const payload = (await response.json().catch(() => ({}))) as {
          mfa?: { totpEnabled?: boolean };
        };

        const requiresMfa = Boolean(payload?.mfa?.totpEnabled);
        setMfaRequirement(requiresMfa ? "required" : "optional");
      } catch (lookupError) {
        if ((lookupError as Error)?.name === "AbortError" || signal.aborted) {
          return;
        }
        setMfaRequirement("optional");
      }
    }, 300);

    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [identifier]);

  useEffect(() => {
    if (user?.mfaEnabled) {
      setMfaRequirement("required");
    }
  }, [user?.mfaEnabled]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError(pageCopy.missingUsername);
      return;
    }
    if (!password) {
      setError(pageCopy.missingPassword);
      return;
    }
    const requiresTotp = mfaRequirement === "required";
    const sanitizedTotp = totpCode.replace(/\D/g, "");

    if (requiresTotp) {
      if (!sanitizedTotp) {
        setError(
          pageCopy.missingTotp ??
            authCopy.alerts.mfa?.missing ??
            authCopy.alerts.missingCredentials,
        );
        return;
      }

      if (sanitizedTotp.length !== 6) {
        setError(
          authCopy.alerts.mfa?.invalidFormat ??
            authCopy.alerts.mfa?.invalid ??
            pageCopy.missingTotp ??
            authCopy.alerts.missingCredentials,
        );
        return;
      }
    } else if (sanitizedTotp && sanitizedTotp.length !== 6) {
      setError(
        authCopy.alerts.mfa?.invalidFormat ??
          authCopy.alerts.mfa?.invalid ??
          pageCopy.missingTotp ??
          authCopy.alerts.missingCredentials,
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const loginBody: {
        identifier: string;
        password: string;
        totp?: string;
        totpCode?: string;
        remember: boolean;
      } = {
        identifier: trimmedIdentifier,
        password,
        remember,
      };
      if (sanitizedTotp.length === 6) {
        // Accounts is the active UAT API boundary and reads `totpCode`.
        // `totp` keeps compatibility with the Portal BFF contract used by
        // environments that still proxy the request through Next.js.
        loginBody.totp = sanitizedTotp;
        loginBody.totpCode = sanitizedTotp;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(loginBody),
        credentials: "include",
      });

      // Two response shapes reach this screen. The portal BFF answers with
      // {success, error, needMfa}; when the edge router sends /api/auth/* to
      // the account service instead, the raw shape comes back, where a
      // required second factor is a 200 carrying mfaRequired and no error at
      // all. Read both so neither routing silently looks like a success.
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string | null;
        needMfa?: boolean;
        mfaRequired?: boolean;
        mfa_required?: boolean;
      };

      const requiresMfa = Boolean(
        payload.needMfa ?? payload.mfaRequired ?? payload.mfa_required,
      );

      if (requiresMfa) {
        setMfaRequirement("required");
        // Only the BFF hands back a challenge cookie and expects the enrolment
        // screen to take over. The account service just asks for the code, so
        // stay on the form and prompt for it.
        if (payload.needMfa) {
          // 跨 boundary（auth → console）只能整页跳转，router 的软导航到不了
          window.location.assign("/panel/account?setupMfa=1");
          return;
        }
        setError(
          authCopy.alerts.mfa?.missing ??
            pageCopy.missingTotp ??
            authCopy.alerts.missingCredentials,
        );
        return;
      }

      const isSuccessful = response.ok && (payload.success ?? true);

      if (!isSuccessful) {
        const messageKey = payload.error ?? "generic_error";
        if (codeRequiresMfa(messageKey)) {
          setMfaRequirement("required");
        }
        setError(
          resolveLoginErrorMessage(
            response.status,
            messageKey,
            pageCopy,
            authCopy,
          ),
        );
        return;
      }

      await login();
      window.location.assign(targetUrl);
    } catch (submitError) {
      console.warn("Login failed", submitError);
      setError(pageCopy.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToPanel = () => {
    window.location.assign(targetUrl);
  };

  const handleGoHome = () => {
    window.location.assign("/");
  };

  const handleLogout = () => {
    window.location.href = "/logout";
  };

  const requiresTotpInput = mfaRequirement === "required";
  const mfaModeLabel = requiresTotpInput
    ? authCopy.form.mfa.passwordAndTotp
    : authCopy.form.mfa.passwordOnly;

  return (
    <>
      {user ? (
        <div className={`space-y-4 ${AUTH_HINT_PANEL_CLASS}`}>
          <div className="space-y-1">
            <p className="text-base font-semibold">
              {pageCopy.success.replace("{username}", user.username)}
            </p>
            <p className="text-xs text-slate-500 animate-pulse">
              {pageCopy.redirecting}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGoToPanel}
              className={AUTH_PRIMARY_BUTTON_CLASS}
            >
              {pageCopy.goToPanel}
            </button>
            <button
              type="button"
              onClick={handleGoHome}
              className={AUTH_SECONDARY_BUTTON_CLASS}
            >
              {pageCopy.goHome}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={AUTH_SECONDARY_BUTTON_CLASS}
            >
              {navCopy.logout}
            </button>
          </div>
        </div>
      ) : null}

      {!user ? (
        <form
          method="post"
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
        >
          <div className="space-y-2">
            <label
              htmlFor="login-identifier"
              className="text-sm font-medium text-slate-600"
            >
              {authCopy.form.email}
            </label>
            <input
              id="login-identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={authCopy.form.emailPlaceholder}
              className={AUTH_INPUT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">
              {authCopy.form.mfa.mode}
            </p>
            <div className={AUTH_HINT_PANEL_CLASS}>{mfaModeLabel}</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label
                htmlFor="login-password"
                className="font-medium text-slate-600"
              >
                {authCopy.form.password}
              </label>
              <Link href="#" className={AUTH_TEXT_LINK_CLASS}>
                {authCopy.forgotPassword}
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={authCopy.form.passwordPlaceholder}
                className={`${AUTH_INPUT_CLASS} pr-12`}
              />
              <button
                type="button"
                aria-label={
                  showPassword
                    ? authCopy.form.hidePassword
                    : authCopy.form.showPassword
                }
                title={
                  showPassword
                    ? authCopy.form.hidePassword
                    : authCopy.form.showPassword
                }
                onClick={() => setShowPassword((visible) => !visible)}
                onMouseDown={(event) => event.preventDefault()}
                className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-inset"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {requiresTotpInput ? (
            <div className="space-y-2">
              <label
                htmlFor="login-totp"
                className="text-sm font-medium text-slate-600"
              >
                {authCopy.form.mfa.codeLabel}
              </label>
              <input
                id="login-totp"
                name="totpCode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={totpCode}
                onChange={(event) => {
                  const digits = event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 6);
                  setTotpCode(digits);
                }}
                placeholder={authCopy.form.mfa.codePlaceholder}
                className={AUTH_INPUT_CLASS}
              />
            </div>
          ) : null}
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              name="remember"
              className={AUTH_CHECKBOX_CLASS}
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            {authCopy.form.remember}
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS}`}
          >
            {isSubmitting ? `${authCopy.form.submit}…` : authCopy.form.submit}
          </button>
          <p className="text-xs text-slate-500">* {pageCopy.disclaimer}</p>
        </form>
      ) : null}
    </>
  );
}
