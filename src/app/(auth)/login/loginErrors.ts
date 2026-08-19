import type { Translation } from "@i18n/translations";

type LoginCopy = Translation["login"];
type AuthLoginCopy = Translation["auth"]["login"];

/**
 * Turn an account-service error code into the copy shown under the form.
 *
 * Kept apart from the component so every code the service can return is
 * covered by a test. An unmapped code used to fall through to the catch-all
 * "try again later" line, which hid a rejected browser Origin, an unverified
 * e-mail address and a suspended account behind the same sentence -- and left
 * a bug report with no term to search for. Unknown codes now carry the status
 * and the code itself rather than pretending to be a transient failure.
 */
export function resolveLoginErrorMessage(
  status: number,
  code: string,
  pageCopy: LoginCopy,
  authCopy: AuthLoginCopy,
): string {
  const missingTotp =
    authCopy.alerts.mfa?.missing ??
    pageCopy.missingTotp ??
    authCopy.alerts.missingCredentials;

  switch (code) {
    case "missing_credentials":
      return authCopy.alerts.missingCredentials;
    case "invalid_credentials":
      return pageCopy.invalidCredentials;
    case "user_not_found":
      return pageCopy.userNotFound;
    case "email_not_verified":
      return pageCopy.emailNotVerified;
    case "account_suspended":
      return pageCopy.accountSuspended;
    case "sandbox_no_login":
      return pageCopy.sandboxNoLogin;
    case "password_required":
      return pageCopy.passwordRequired;
    case "mfa_code_required":
    case "mfa_required":
      return missingTotp;
    case "mfa_setup_required":
      return pageCopy.mfaSetupRequired;
    case "invalid_mfa_code":
      return authCopy.alerts.mfa?.invalid ?? pageCopy.genericError;
    case "mfa_challenge_failed":
      return authCopy.alerts.mfa?.challengeFailed ?? pageCopy.genericError;
    case "account_service_unreachable":
    case "account_service_misconfigured":
    case "billing_state_unavailable":
      return pageCopy.serviceUnavailable ?? pageCopy.genericError;
    default:
      return pageCopy.genericErrorWithCode.replace(
        "{code}",
        `${status} / ${code}`,
      );
  }
}

/** Codes that mean the account has a second factor the form must ask for. */
export function codeRequiresMfa(code: string): boolean {
  return (
    code === "mfa_code_required" ||
    code === "invalid_mfa_code" ||
    code === "mfa_required" ||
    code === "mfa_setup_required" ||
    code === "mfa_challenge_failed"
  );
}
