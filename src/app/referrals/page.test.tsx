import { beforeEach, describe, expect, it, vi } from "vitest";
const cookie = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookie }) }));
vi.mock("next/navigation", () => ({
  redirect: (href: string) => {
    throw new Error(`redirect:${href}`);
  },
}));
vi.mock("@/components/referrals/ReferralCenter", () => ({
  default: () => null,
}));
import ReferralsPage from "./page";
describe("referral center server entry", () => {
  beforeEach(() => cookie.mockReset());
  it("requires a session even when platform middleware is absent", async () => {
    cookie.mockReturnValue(undefined);
    await expect(ReferralsPage()).rejects.toThrow(
      "redirect:/login?redirect=%2Freferrals",
    );
  });
  it("renders account UI with a cookie while data API still verifies its session", async () => {
    cookie.mockReturnValue({ value: "local-test-session" });
    expect(await ReferralsPage()).toBeTruthy();
  });
});
