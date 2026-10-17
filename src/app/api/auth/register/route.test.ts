import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("@server/serviceConfig", () => ({
  getAccountServiceApiBaseUrl: () => "https://accounts.example/api/auth",
}));
import { POST } from "./route";
const request = (body: unknown) =>
  new NextRequest("https://console.svc.plus/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
const registration = {
  email: "new@example.com",
  password: "test-fixture-password",
  confirmPassword: "test-fixture-password",
  code: "123456",
  name: "newuser",
};
describe("registration attribution proxy", () => {
  beforeEach(() => vi.restoreAllMocks());
  it("forwards only the normalized optional referral code", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));
    expect(
      (
        await POST(
          request({
            ...registration,
            referralCode: " ab12cd34 ",
            inviterId: "caller-selected-user",
          }),
        )
      ).status,
    ).toBe(200);
    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(body.referralCode).toBe("AB12CD34");
    expect(body.inviterId).toBeUndefined();
  });
  it("rejects malformed codes before contacting Accounts", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    expect(
      (await POST(request({ ...registration, referralCode: "invalid?code" })))
        .status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps registration without a referral compatible", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}"));
    expect((await POST(request(registration))).status).toBe(200);
    expect(
      JSON.parse(fetchMock.mock.calls[0][1]?.body as string),
    ).not.toHaveProperty("referralCode");
  });
});
