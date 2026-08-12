"use client";

import Link from "next/link";
import { Github } from "lucide-react";
import {
  ChangeEvent,
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  AUTH_CHECKBOX_CLASS,
  AUTH_CODE_INPUT_CLASS,
  AUTH_HINT_PANEL_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
  AUTH_TEXT_LINK_CLASS,
  AuthLayout,
  AuthLayoutSocialButton,
} from "@components/auth/AuthLayout";
import { useLanguage } from "@i18n/LanguageProvider";
import { translations } from "@i18n/translations";

type AlertState = { type: "error" | "success" | "info"; message: string };

const VERIFICATION_CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PASSWORD_STRENGTH_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const USERNAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9]{3,15}$/;

type RegisterContentProps = {
  accountServiceBaseUrl: string;
};

export default function RegisterContent({
  accountServiceBaseUrl,
}: RegisterContentProps) {
  const { language } = useLanguage();
  const t = translations[language].auth.register;
  const alerts = t.alerts;
  const searchParams = useSearchParams();
  const router = useRouter();
  const returnTo = useMemo(() => {
    const requested = searchParams.get("returnTo");
    return requested?.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/";
  }, [searchParams]);

  const isSocialAuthVisible = false;
  const githubAuthUrl = `${accountServiceBaseUrl}/api/auth/oauth/login/github`;
  const googleAuthUrl = `${accountServiceBaseUrl}/api/auth/oauth/login/google`;

  const socialButtons = useMemo<AuthLayoutSocialButton[]>(() => {
    if (!isSocialAuthVisible) {
      return [];
    }

    return [
      {
        label: t.social.github,
        href: githubAuthUrl,
        icon: <Github className="h-5 w-5" aria-hidden />,
      },
      {
        label: "Google",
        href: googleAuthUrl,
        icon: <div className="h-5 w-5 flex items-center justify-center">G</div>,
      },
    ];
  }, [githubAuthUrl, googleAuthUrl, isSocialAuthVisible, t.social.github]);

  useEffect(() => {
    const sensitiveKeys = ["username", "password", "confirmPassword", "email"];
    const hasSensitiveParams = sensitiveKeys.some((key) =>
      searchParams.has(key),
    );

    if (!hasSensitiveParams) {
      return;
    }

    const sanitized = new URLSearchParams(searchParams.toString());
    sensitiveKeys.forEach((key) => sanitized.delete(key));

    const queryString = sanitized.toString();
    router.replace(queryString ? `/register?${queryString}` : "/register", {
      scroll: false,
    });
  }, [router, searchParams]);

  const normalize = useCallback(
    (value: string) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, ""),
    [],
  );

  const initialAlert = useMemo<AlertState | null>(() => {
    const errorParam = searchParams.get("error");
    const successParam = searchParams.get("success");

    if (successParam === "1") {
      return { type: "success", message: alerts.success };
    }

    if (!errorParam) {
      return null;
    }

    const normalizedError = normalize(errorParam);
    const errorMap: Record<string, string> = {
      missing_fields: alerts.missingFields,
      email_and_password_are_required: alerts.missingFields,
      password_mismatch: alerts.passwordMismatch,
      user_already_exists: alerts.userExists,
      email_must_be_a_valid_address: alerts.invalidEmail,
      password_must_be_at_least_8_characters: alerts.weakPassword,
      email_already_exists: alerts.userExists,
      name_already_exists: alerts.usernameExists ?? alerts.userExists,
      invalid_email: alerts.invalidEmail,
      password_too_short: alerts.weakPassword,
      invalid_name: alerts.invalidName ?? alerts.genericError,
      name_required: alerts.invalidName ?? alerts.genericError,
      credentials_in_query: alerts.genericError,
    };
    const message = errorMap[normalizedError] ?? alerts.genericError;
    return { type: "error", message };
  }, [alerts, normalize, searchParams]);

  const [alert, setAlert] = useState<AlertState | null>(initialAlert);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Wizard Step State: 0 = Info, 1 = Verification, 2 = Success (Processing/Redirecting)
  const [currentStep, setCurrentStep] = useState<0 | 1 | 2>(0);

  const [codeDigits, setCodeDigits] = useState<string[]>(() =>
    Array(VERIFICATION_CODE_LENGTH).fill(""),
  );
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const [formValues, setFormValues] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreement: false,
  });

  const [isFormReady, setIsFormReady] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setAlert(initialAlert);
  }, [initialAlert]);

  useEffect(() => {
    setIsFormReady(true);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  const focusCodeInput = useCallback((index: number) => {
    const input = codeInputRefs.current[index];
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const resetCodeDigits = useCallback(() => {
    setCodeDigits(Array(VERIFICATION_CODE_LENGTH).fill(""));
  }, []);

  const handleInputChange = useCallback(
    (field: "username" | "email" | "password" | "confirmPassword") =>
      (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        setFormValues((previous) => ({ ...previous, [field]: value }));
      },
    [],
  );

  const handleAgreementChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormValues((previous) => ({
        ...previous,
        agreement: event.target.checked,
      }));
    },
    [],
  );

  const handleCodeChange = useCallback(
    (index: number, value: string) => {
      const sanitized = value.replace(/\D/g, "");
      setCodeDigits((previous) => {
        const next = [...previous];
        next[index] = sanitized ? (sanitized[sanitized.length - 1] ?? "") : "";
        return next;
      });

      if (sanitized && index < VERIFICATION_CODE_LENGTH - 1) {
        focusCodeInput(index + 1);
      } else if (sanitized && index === VERIFICATION_CODE_LENGTH - 1) {
        // Auto-submit when the last digit is entered
        // We use a timeout to let the state update first
        setTimeout(() => {
          const form = formRef.current;
          if (form) form.requestSubmit();
        }, 100);
      }
    },
    [focusCodeInput],
  );

  const handleCodeKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Backspace" && !codeDigits[index] && index > 0) {
        event.preventDefault();
        setCodeDigits((previous) => {
          const next = [...previous];
          next[index - 1] = "";
          return next;
        });
        focusCodeInput(index - 1);
        return;
      }

      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        focusCodeInput(index - 1);
        return;
      }

      if (event.key === "ArrowRight" && index < VERIFICATION_CODE_LENGTH - 1) {
        event.preventDefault();
        focusCodeInput(index + 1);
      }
    },
    [codeDigits, focusCodeInput],
  );

  const handleCodePaste = useCallback(
    (index: number, event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const clipboardValue = event.clipboardData
        .getData("text")
        .replace(/\D/g, "");
      if (!clipboardValue) {
        return;
      }

      const digits = clipboardValue
        .slice(0, VERIFICATION_CODE_LENGTH - index)
        .split("");
      setCodeDigits((previous) => {
        const next = [...previous];
        digits.forEach((digit, offset) => {
          const targetIndex = index + offset;
          if (targetIndex < VERIFICATION_CODE_LENGTH) {
            next[targetIndex] = digit;
          }
        });
        return next;
      });

      const lastFilledIndex = Math.min(
        index + digits.length - 1,
        VERIFICATION_CODE_LENGTH - 1,
      );
      focusCodeInput(lastFilledIndex);
    },
    [focusCodeInput],
  );

  const showError = (message: string) => {
    setAlert({ type: "error", message });
  };

  const showStatus = (message: string) => {
    setAlert({ type: "info", message });
  };

  // Step 1: Request Verification Code
  const handleRequestVerification = async () => {
    const { username, email, password, confirmPassword, agreement } =
      formValues;

    if (!username.trim() || !USERNAME_PATTERN.test(username.trim())) {
      showError(alerts.invalidName ?? alerts.missingFields);
      return;
    }

    if (!email || !EMAIL_PATTERN.test(email)) {
      showError(alerts.invalidEmail);
      return;
    }

    if (!password || !confirmPassword) {
      showError(alerts.missingFields);
      return;
    }

    if (!PASSWORD_STRENGTH_PATTERN.test(password)) {
      showError(alerts.weakPassword ?? alerts.genericError);
      return;
    }

    if (password !== confirmPassword) {
      showError(alerts.passwordMismatch);
      return;
    }

    if (!agreement) {
      showError(alerts.agreementRequired ?? alerts.missingFields);
      return;
    }

    setIsSubmitting(true);
    showStatus(
      t.form.validation?.submitting ??
        t.form.submitting ??
        "Submitting registration request…",
    );

    try {
      const response = await fetch("/api/auth/register/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        // ... (error handling)
        let errorCode = "generic_error";
        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            errorCode = data.error;
          }
        } catch (error) {
          console.error("Failed to parse verification send response", error);
        }

        const errorMap: Record<string, string> = {
          invalid_request: alerts.genericError,
          invalid_email: alerts.invalidEmail,
          verification_failed: alerts.verificationFailed ?? alerts.genericError,
          email_already_exists: alerts.userExists,
          account_service_unreachable: alerts.genericError,
        };

        showError(errorMap[normalize(errorCode)] ?? alerts.genericError);
        return;
      }

      // Success: Move to Step 2
      setCurrentStep(1);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      resetCodeDigits();

      const successMessage = alerts.verificationSent ?? alerts.genericError;
      setAlert({ type: "success", message: successMessage });

      // Focus code input after a short delay for state transition
      setTimeout(() => focusCodeInput(0), 100);
    } catch (error) {
      console.error("Failed to request verification code", error);
      showError(alerts.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify Code & Register
  const handleCompleteRegistration = async () => {
    const verificationCode = codeDigits.join("");
    if (verificationCode.length !== VERIFICATION_CODE_LENGTH) {
      showError(
        alerts.codeRequired ?? alerts.invalidCode ?? alerts.missingFields,
      );
      return;
    }

    setIsSubmitting(true);
    showStatus(
      t.form.validation?.completing ??
        t.form.completing ??
        t.form.completeSubmit ??
        t.form.submit,
    );

    try {
      const { username, email, password } = formValues;

      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: username.trim(),
          email: email.trim(),
          password,
          code: verificationCode,
        }),
      });

      let registerData: { success?: boolean; error?: string } | null = null;
      try {
        registerData = await registerResponse.json();
      } catch (error) {
        registerData = null;
      }

      if (!registerResponse.ok || registerData?.success === false) {
        // ... (error handling)
        const errorCode =
          typeof registerData?.error === "string"
            ? registerData.error
            : "registration_failed";
        const errorMap: Record<string, string> = {
          invalid_request: alerts.genericError,
          missing_credentials: alerts.missingFields,
          invalid_email: alerts.invalidEmail,
          password_too_short: alerts.weakPassword,
          email_already_exists: alerts.userExists,
          name_already_exists: alerts.usernameExists ?? alerts.userExists,
          invalid_name: alerts.invalidName ?? alerts.genericError,
          name_required: alerts.invalidName ?? alerts.genericError,
          hash_failure: alerts.genericError,
          user_creation_failed: alerts.genericError,
          credentials_in_query: alerts.genericError,
          verification_required: alerts.codeRequired ?? alerts.genericError,
          invalid_code:
            alerts.verificationFailed ??
            alerts.invalidCode ??
            alerts.genericError,
          account_service_unreachable: alerts.genericError,
        };

        showError(errorMap[normalize(errorCode)] ?? alerts.genericError);
        return;
      }

      // 2. Login
      const loginResponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      let loginData: {
        success?: boolean;
        needMfa?: boolean;
        error?: string;
        redirectTo?: string;
      } | null = null;
      try {
        loginData = await loginResponse.json();
      } catch (error) {
        loginData = null;
      }

      if (!loginResponse.ok || !loginData?.success) {
        // Login failed but registration succeeded
        const successMessage = alerts.registrationComplete ?? alerts.success;
        setAlert({ type: "success", message: successMessage });
        router.push(
          returnTo === "/"
            ? "/login"
            : `/login?redirect=${encodeURIComponent(returnTo)}`,
        );
        return;
      }

      if (loginData?.needMfa) {
        router.push("/login?needMfa=1");
        router.refresh();
        return;
      }

      // Success
      setCurrentStep(2);
      const successMessage = alerts.registrationComplete ?? alerts.success;
      setAlert({ type: "success", message: successMessage });

      const accountRedirect = loginData?.redirectTo;
      const safeAccountRedirect =
        accountRedirect?.startsWith("/") && !accountRedirect.startsWith("//")
          ? accountRedirect
          : undefined;
      router.push(safeAccountRedirect || returnTo);
      router.refresh();
    } catch (error) {
      console.error("Failed to complete registration", error);
      showError(alerts.genericError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (currentStep === 0) {
      handleRequestVerification();
    } else if (currentStep === 1) {
      handleCompleteRegistration();
    }
  };

  const handleResend = useCallback(async () => {
    if (isResending || resendCooldown > 0) return;

    const { email } = formValues;
    if (!email) return;

    setIsResending(true);
    const resendStatusMessage =
      t.form.verificationCodeResending ??
      (t.form.verificationCodeResend
        ? `${t.form.verificationCodeResend}…`
        : "Resending verification code…");
    setAlert({ type: "info", message: resendStatusMessage });

    try {
      const response = await fetch("/api/auth/register/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        setAlert({ type: "error", message: alerts.genericError });
        return;
      }

      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      const message =
        alerts.verificationResent ??
        alerts.verificationSent ??
        "Verification code resent.";
      setAlert({ type: "success", message });
    } catch (error) {
      setAlert({ type: "error", message: alerts.genericError });
    } finally {
      setIsResending(false);
    }
  }, [alerts, formValues, isResending, resendCooldown, t.form]);

  // Render Helpers
  const aboveForm = t.uuidNote ? (
    <div className={AUTH_HINT_PANEL_CLASS}>{t.uuidNote}</div>
  ) : null;

  const submitLabel = useMemo(() => {
    if (isSubmitting) {
      if (currentStep === 0) return t.form.submitting ?? t.form.submit;
      return t.form.completing ?? t.form.submit;
    }
    if (currentStep === 0) return "下一步 (获取验证码)";
    return t.form.completeSubmit ?? "完成注册";
  }, [isSubmitting, currentStep, t.form]);

  const resendLabel = isResending
    ? (t.form.verificationCodeResending ?? t.form.verificationCodeResend)
    : resendCooldown > 0
      ? `${t.form.verificationCodeResend} (${resendCooldown}s)`
      : t.form.verificationCodeResend;

  return (
    <AuthLayout
      mode="register"
      badge={t.badge}
      title={t.form.title}
      description={t.form.subtitle}
      alert={alert}
      socialHeading={t.social.title}
      socialButtons={socialButtons}
      aboveForm={aboveForm}
      switchAction={{
        text: t.loginPrompt.text,
        linkLabel: t.loginPrompt.link,
        href: "/login",
      }}
      bottomNote={t.bottomNote}
    >
      <form
        ref={formRef}
        className="space-y-5"
        method="post"
        onSubmit={handleSubmit}
        noValidate
      >
        {currentStep === 0 && (
          <>
            <div className="space-y-2">
              <label
                htmlFor="username"
                className="text-sm font-medium text-slate-600"
              >
                {t.form.name || "Username"}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                placeholder={
                  t.form.namePlaceholder || "4-16 chars, starts with letter"
                }
                className={AUTH_INPUT_CLASS}
                required
                value={formValues.username}
                onChange={handleInputChange("username")}
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-600"
              >
                {t.form.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t.form.emailPlaceholder}
                className={AUTH_INPUT_CLASS}
                required
                value={formValues.email}
                onChange={handleInputChange("email")}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-600"
                >
                  {t.form.password}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t.form.passwordPlaceholder}
                  className={AUTH_INPUT_CLASS}
                  required
                  value={formValues.password}
                  onChange={handleInputChange("password")}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="confirm-password"
                  className="text-sm font-medium text-slate-600"
                >
                  {t.form.confirmPassword}
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t.form.confirmPasswordPlaceholder}
                  className={AUTH_INPUT_CLASS}
                  required
                  value={formValues.confirmPassword}
                  onChange={handleInputChange("confirmPassword")}
                />
              </div>
            </div>

            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                name="agreement"
                required
                className={AUTH_CHECKBOX_CLASS}
                checked={formValues.agreement}
                onChange={handleAgreementChange}
              />
              <span>
                {t.form.agreement}{" "}
                <Link href="/docs" className={AUTH_TEXT_LINK_CLASS}>
                  {t.form.terms}
                </Link>
              </span>
            </label>
          </>
        )}

        {currentStep === 1 && (
          <div className="space-y-6">
            <div className={AUTH_HINT_PANEL_CLASS}>
              我们已向你的邮箱 <strong>{formValues.email}</strong>{" "}
              发送一封验证邮件。
              <br />
              验证链接有效期 10 分钟。
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-600">
                {t.form.verificationCodeLabel}
              </label>
              <div className="flex justify-between gap-2">
                {codeDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      codeInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    className={AUTH_CODE_INPUT_CLASS}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    onPaste={(e) => index === 0 && handleCodePaste(0, e)}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(0)}
                className="text-sm font-medium text-slate-500 transition hover:text-slate-800"
              >
                ← 返回修改信息
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={isResending || resendCooldown > 0}
                className={`${AUTH_TEXT_LINK_CLASS} text-sm disabled:cursor-not-allowed disabled:opacity-50`}
                style={{ zIndex: 10, position: "relative" }}
              >
                {resendLabel}
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={
            isSubmitting || (currentStep === 1 && codeDigits.some((d) => !d))
          }
          className={`w-full ${AUTH_PRIMARY_BUTTON_CLASS}`}
        >
          {submitLabel}
        </button>
      </form>
    </AuthLayout>
  );
}
