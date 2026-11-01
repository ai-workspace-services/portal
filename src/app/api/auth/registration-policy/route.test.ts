import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@server/serviceConfig", () => ({
  getAccountServiceApiBaseUrl: () => "https://accounts.example/api/auth",
}));
import { GET } from "./route";
describe("registration policy proxy", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("forwards only the public policy and disables caching", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          mode: "open",
          emailVerificationRequired: false,
          privateConfig: "must-not-be-forwarded",
        }),
      ),
    );
    const response = await GET();
    expect(await response.json()).toEqual({
      mode: "open",
      emailVerificationRequired: false,
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([{}, { mode: "unknown", emailVerificationRequired: false }])(
    "fails closed on invalid policy %s",
    async (policy) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(policy)),
      );
      expect((await GET()).status).toBe(503);
    },
  );
});
