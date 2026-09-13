"use client";

import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Github } from "@/components/icons/brand";

import {
  AUTH_CHECKBOX_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
  AUTH_TEXT_LINK_CLASS,
  AuthLayout,
  AuthLayoutSocialButton,
} from "@components/auth/AuthLayout";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";

type LoginContentProps = {
  accountServiceBaseUrl: string;
  children?: ReactNode;
};

export default function LoginContent({
  accountServiceBaseUrl,
  children,
}: LoginContentProps) {
  const { language } = useLanguage();
  const t = translations[language].auth.login;
  const pageCopy = translations[language].login;
  const alerts = t.alerts;
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const sensitiveKeys = ["username", "password", "email"];
    const hasSensitiveParams = sensitiveKeys.some((key) =>
      searchParams.has(key),
    );

    if (!hasSensitiveParams) {
      return;
    }

    const sanitized = new URLSearchParams(searchParams.toString());
    sensitiveKeys.forEach((key) => sanitized.delete(key));

    const queryString = sanitized.toString();
    router.replace(queryString ? `/login?${queryString}` : "/login", {
      scroll: false,
    });
  }, [router, searchParams]);

  const errorParam = searchParams.get("error");
  const registeredParam = searchParams.get("registered");
  const setupMfaParam = searchParams.get("setupMfa");
  const redirectParam =
    searchParams.get("redirect") ?? searchParams.get("returnTo");

  const normalize = useCallback(
    (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, ""),
    [],
  );

  const loginUrl =
    process.env.NEXT_PUBLIC_LOGIN_URL ||
    `${accountServiceBaseUrl}/api/auth/login`;

  const socialButtonsDisabled = false;
  const githubAuthUrl = "/api/auth/oauth/login/github";
  const googleAuthUrl = "/api/auth/oauth/login/google";

  useEffect(() => {
    const exchangeCode = searchParams.get("exchange_code");

    if (!exchangeCode) {
      return;
    }

    setIsSubmitting(true);
    setAlert({
      type: "success",
      message: alerts.submit ?? "Authenticating...",
    });

    const exchangeToken = async () => {
      try {
        const response = await fetch("/api/auth/token/exchange", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            exchangeCode,
          }),
        });

        if (!response.ok) {
          throw new Error("Token exchange failed");
        }

        const target =
          redirectParam &&
          redirectParam.startsWith("/") &&
          !redirectParam.startsWith("//")
            ? redirectParam
            : "/panel";
        window.location.assign(target);
      } catch (error) {
        console.error("Token exchange failed:", error);
        setAlert({ type: "error", message: alerts.genericError });
        setIsSubmitting(false);
      }
    };

    exchangeToken();
  }, [searchParams, router, redirectParam, alerts.submit, alerts.genericError]);

  const loginUrlRef = useRef(loginUrl);

  const deriveSameOriginLoginFallback = useCallback(
    (url: string): string | undefined => {
      if (typeof window === "undefined") {
        return undefined;
      }

      try {
        const currentOrigin = window.location.origin;
        const parsed = new URL(url, currentOrigin);

        if (parsed.origin === currentOrigin) {
          const relative =
            `${parsed.pathname}${parsed.search}${parsed.hash}` ||
            "/api/auth/login";
          return relative;
        }

        const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);
        const parsedHostname = parsed.hostname.toLowerCase();
        const browserHostname = window.location.hostname.toLowerCase();

        const parsedIsLocal = localHostnames.has(parsedHostname);
        const browserIsLocal = localHostnames.has(browserHostname);

        if (!browserIsLocal && parsedIsLocal) {
          const relative =
            `${parsed.pathname}${parsed.search}${parsed.hash}` ||
            "/api/auth/login";
          return relative;
        }

        if (
          window.location.protocol === "https:" &&
          parsed.protocol === "http:" &&
          parsedHostname === browserHostname
        ) {
          parsed.protocol = "https:";
          return parsed.toString();
        }
      } catch (error) {
        console.warn("Failed to derive same-origin login fallback", error);
      }

      return undefined;
    },
    [],
  );

  useEffect(() => {
    loginUrlRef.current = loginUrl;
  }, [loginUrl]);

  const initialAlert = useMemo(() => {
    const successMessages: string[] = [];
    if (registeredParam === "1") {
      successMessages.push(alerts.registered);
    }
    if (setupMfaParam === "1") {
      const setupRequiredMessage =
        alerts.mfa?.setupRequired ?? alerts.genericError;
      if (setupRequiredMessage) {
        successMessages.push(setupRequiredMessage);
      }
    }

    if (successMessages.length > 0) {
      return { type: "success", message: successMessages.join(" ") } as const;
    }

    if (!errorParam) {
      return null;
    }

    const normalizedError = normalize(errorParam);
    const errorMap: Record<string, string> = {
      missing_credentials: alerts.missingCredentials,
      email_and_password_are_required: alerts.missingCredentials,
      invalid_credentials: alerts.invalidCredentials,
      user_not_found: alerts.userNotFound ?? alerts.genericError,
      credentials_in_query: alerts.genericError,
      invalid_request: alerts.genericError,
      // Codes a route guard forwards after the session resolved to no user.
      // These arrive with working credentials, so the invalid-credentials
      // copy would send the user to reset a password that is fine.
      account_suspended: pageCopy.accountSuspended,
      session_unavailable: pageCopy.serviceUnavailable ?? alerts.genericError,
      session_user_unidentified:
        pageCopy.serviceUnavailable ?? alerts.genericError,
    };
    const message = errorMap[normalizedError] ?? alerts.genericError;
    return { type: "error", message } as const;
  }, [alerts, errorParam, normalize, pageCopy, registeredParam, setupMfaParam]);

  const [alert, setAlert] = useState(initialAlert);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reactivationRequired, setReactivationRequired] = useState(false);
  const [reactivationEmail, setReactivationEmail] = useState("");
  const [reactivationCode, setReactivationCode] = useState("");
  const [isReactivating, setIsReactivating] = useState(false);

  useEffect(() => {
    setAlert(initialAlert);
    setReactivationRequired(false);
  }, [initialAlert]);

  const handleReactivate = useCallback(async () => {
    const email = reactivationEmail.trim().toLowerCase();
    const code = reactivationCode.trim();
    if (!email || code.length !== 6) {
      setAlert({
        type: "error",
        message:
          language === "zh"
            ? "请输入邮箱和 6 位激活验证码"
            : "Enter your email and 6-digit activation code",
      });
      return;
    }
    setIsReactivating(true);
    try {
      const response = await fetch("/api/auth/account/reactivate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, code }),
      });
      if (!response.ok) {
        setAlert({
          type: "error",
          message:
            language === "zh"
              ? "激活验证码无效或已过期"
              : "The activation code is invalid or expired",
        });
        return;
      }
      window.location.assign(
        redirectParam &&
          redirectParam.startsWith("/") &&
          !redirectParam.startsWith("//")
          ? redirectParam
          : "/panel",
      );
    } catch (error) {
      console.error("Failed to reactivate account", error);
      setAlert({ type: "error", message: alerts.genericError });
    } finally {
      setIsReactivating(false);
    }
  }, [
    alerts.genericError,
    language,
    reactivationCode,
    reactivationEmail,
    redirectParam,
  ]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) {
        return;
      }

      const formData = new FormData(event.currentTarget);
      const username = String(formData.get("username") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const remember = formData.get("remember") === "on";

      if (!username || !password) {
        setAlert({ type: "error", message: alerts.missingCredentials });
        return;
      }

      setIsSubmitting(true);
      setAlert(null);

      try {
        const requestPayload = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            username,
            password,
            remember,
          }),
        } as const;

        let response: Response;
        let usedUrl = loginUrlRef.current;

        try {
          response = await fetch(usedUrl, requestPayload);
        } catch (primaryError) {
          const sameOriginFallback = deriveSameOriginLoginFallback(usedUrl);
          if (sameOriginFallback && sameOriginFallback !== usedUrl) {
            try {
              response = await fetch(sameOriginFallback, requestPayload);
              loginUrlRef.current = sameOriginFallback;
              usedUrl = sameOriginFallback;
            } catch (fallbackError) {
              console.error(
                "Primary login request failed, same-origin fallback also failed",
                fallbackError,
              );
              throw fallbackError;
            }
          } else {
            const httpsPattern = /^https:/i;
            if (httpsPattern.test(usedUrl)) {
              const insecureUrl = usedUrl.replace(httpsPattern, "http:");

              try {
                response = await fetch(insecureUrl, requestPayload);
                loginUrlRef.current = insecureUrl;
                usedUrl = insecureUrl;
              } catch (fallbackError) {
                console.error(
                  "Primary login request failed, insecure fallback also failed",
                  fallbackError,
                );
                throw fallbackError;
              }
            } else {
              throw primaryError;
            }
          }
        }

        if (!response.ok) {
          let errorCode = "invalid_credentials";
          try {
            const data = await response.json();
            if (typeof data?.error === "string") {
              errorCode = data.error;
            }
          } catch (error) {
            console.error("Failed to parse login response", error);
          }

          const errorMap: Record<string, string> = {
            invalid_credentials: alerts.invalidCredentials,
            missing_credentials: alerts.missingCredentials,
            user_not_found: alerts.userNotFound ?? alerts.genericError,
            invalid_request: alerts.genericError,
            credentials_in_query: alerts.genericError,
          };

          if (errorCode === "account_archived") {
            setReactivationEmail(username);
            setReactivationRequired(true);
            setAlert({
              type: "error",
              message:
                language === "zh"
                  ? "账号因长期不活跃已归档。激活邮件已发送，请输入验证码恢复账号。"
                  : "Your account was archived after prolonged inactivity. Check your email for an activation code.",
            });
            return;
          }

          setAlert({
            type: "error",
            message: errorMap[normalize(errorCode)] ?? alerts.genericError,
          });
          return;
        }

        const data: { redirectTo?: string } = await response
          .json()
          .catch(() => ({}));
        const redirectTarget =
          redirectParam &&
          redirectParam.startsWith("/") &&
          !redirectParam.startsWith("//")
            ? redirectParam
            : undefined;
        const target = redirectTarget || data?.redirectTo || "/panel";
        window.location.assign(target);
      } catch (error) {
        console.error("Failed to submit login request", error);
        setAlert({ type: "error", message: alerts.genericError });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      alerts,
      deriveSameOriginLoginFallback,
      isSubmitting,
      normalize,
      redirectParam,
      language,
    ],
  );

  const socialButtons = useMemo<AuthLayoutSocialButton[]>(() => {
    return [
      {
        label: t.social.github,
        href: githubAuthUrl,
        icon: <Github className="h-5 w-5" aria-hidden />,
        disabled: socialButtonsDisabled,
      },
      {
        label: "Google",
        href: googleAuthUrl,
        icon: <div className="h-5 w-5 flex items-center justify-center">G</div>, // Replace with proper icon later if available
        disabled: socialButtonsDisabled,
      },
    ];
  }, [githubAuthUrl, googleAuthUrl, socialButtonsDisabled, t.social.github]);

  const formContent = useMemo(() => {
    if (children) {
      return children;
    }

    return (
      <div className="space-y-5">
        <form
          className="space-y-5"
          method="post"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="space-y-2">
            <label
              htmlFor="login-username"
              className="text-sm font-medium text-slate-600"
            >
              {t.form.email}
            </label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder={t.form.emailPlaceholder}
              className={AUTH_INPUT_CLASS}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <label
                htmlFor="login-password"
                className="font-medium text-slate-600"
              >
                {t.form.password}
              </label>
              <Link href="#" className={AUTH_TEXT_LINK_CLASS}>
                {t.forgotPassword}
              </Link>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={t.form.passwordPlaceholder}
              className={AUTH_INPUT_CLASS}
              required
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              name="remember"
              className={AUTH_CHECKBOX_CLASS}
            />
            {t.form.remember}
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS}`}
          >
            {isSubmitting
              ? (t.form.submitting ?? t.form.submit)
              : t.form.submit}
          </button>
        </form>
        {reactivationRequired ? (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-900">
              {language === "zh"
                ? "请输入激活邮件中的验证码以恢复账号。"
                : "Enter the code from the activation email to restore your account."}
            </p>
            <input
              value={reactivationEmail}
              onChange={(event) => setReactivationEmail(event.target.value)}
              type="email"
              autoComplete="email"
              placeholder={language === "zh" ? "邮箱" : "Email"}
              className={AUTH_INPUT_CLASS}
            />
            <input
              value={reactivationCode}
              onChange={(event) =>
                setReactivationCode(
                  event.target.value.replace(/\D/g, "").slice(0, 6),
                )
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={
                language === "zh" ? "6 位激活验证码" : "6-digit activation code"
              }
              className={AUTH_INPUT_CLASS}
            />
            <button
              type="button"
              disabled={isReactivating}
              onClick={handleReactivate}
              className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS}`}
            >
              {isReactivating
                ? language === "zh"
                  ? "激活中…"
                  : "Activating…"
                : language === "zh"
                  ? "邮件激活并恢复账号"
                  : "Activate and restore account"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }, [
    children,
    handleReactivate,
    handleSubmit,
    isReactivating,
    language,
    reactivationCode,
    reactivationEmail,
    reactivationRequired,
    isSubmitting,
    t,
  ]);
  return (
    <AuthLayout
      mode="login"
      badge={t.badge}
      title={t.form.title}
      description={t.form.subtitle}
      alert={alert}
      socialHeading={t.social.title}
      socialButtons={socialButtons}
      switchAction={{
        text: t.registerPrompt.text,
        linkLabel: t.registerPrompt.link,
        href: "/register",
      }}
      bottomNote={t.bottomNote}
    >
      {formContent}
    </AuthLayout>
  );
}
