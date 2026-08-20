import { describe, expect, it } from "vitest";

import { translations } from "../../../../i18n/translations";

import { codeRequiresMfa, resolveLoginErrorMessage } from "../loginErrors";

const zh = translations.zh;
const en = translations.en;

function resolve(status: number, code: string, locale = zh) {
  return resolveLoginErrorMessage(status, code, locale.login, locale.auth.login);
}

describe("resolveLoginErrorMessage", () => {
  it("distinguishes the states a user can act on", () => {
    // These four used to collapse into the same "try again later" line, so a
    // user had no way to tell a typo from an unverified address.
    expect(resolve(401, "invalid_credentials")).toBe(zh.login.invalidCredentials);
    expect(resolve(404, "user_not_found")).toBe(zh.login.userNotFound);
    expect(resolve(401, "email_not_verified")).toBe(zh.login.emailNotVerified);
    expect(resolve(403, "account_suspended")).toBe(zh.login.accountSuspended);

    expect(
      new Set([
        resolve(401, "invalid_credentials"),
        resolve(404, "user_not_found"),
        resolve(401, "email_not_verified"),
        resolve(403, "account_suspended"),
      ]).size,
    ).toBe(4);
  });

  it("asks for the second factor rather than reporting a failure", () => {
    const missingTotp = zh.auth.login.alerts.mfa?.missing ?? zh.login.missingTotp;
    expect(resolve(400, "mfa_code_required")).toBe(missingTotp);
    expect(resolve(200, "mfa_required")).toBe(missingTotp);
    expect(resolve(403, "mfa_setup_required")).toBe(zh.login.mfaSetupRequired);
  });

  it("treats an unreachable or misconfigured account service as transient", () => {
    const unavailable = zh.login.serviceUnavailable ?? zh.login.genericError;
    expect(resolve(502, "account_service_unreachable")).toBe(unavailable);
    expect(resolve(502, "account_service_misconfigured")).toBe(unavailable);
    expect(resolve(503, "billing_state_unavailable")).toBe(unavailable);
  });

  it("names the status and code for anything it does not recognise", () => {
    // An empty 403 from a rejected browser Origin arrives with no error body
    // at all. Reporting it as a plain "try again later" is what kept that
    // defect invisible.
    const message = resolve(403, "generic_error");
    expect(message).toContain("403");
    expect(message).toContain("generic_error");
    expect(message).not.toBe(zh.login.genericError);

    expect(resolve(500, "some_future_code")).toContain("some_future_code");
  });

  it("keeps both locales in step", () => {
    const message = resolve(403, "unmapped_code", en);
    expect(message).toContain("403");
    expect(message).toContain("unmapped_code");
    expect(resolve(401, "email_not_verified", en)).toBe(en.login.emailNotVerified);
  });
});

describe("codeRequiresMfa", () => {
  it("covers every code that means a second factor is involved", () => {
    for (const code of [
      "mfa_code_required",
      "invalid_mfa_code",
      "mfa_required",
      "mfa_setup_required",
      "mfa_challenge_failed",
    ]) {
      expect(codeRequiresMfa(code)).toBe(true);
    }
  });

  it("leaves unrelated failures alone", () => {
    expect(codeRequiresMfa("invalid_credentials")).toBe(false);
    expect(codeRequiresMfa("email_not_verified")).toBe(false);
    expect(codeRequiresMfa("generic_error")).toBe(false);
  });
});
