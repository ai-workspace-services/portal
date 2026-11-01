import { NextResponse } from "next/server";
import { getAccountServiceApiBaseUrl } from "@server/serviceConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const response = await fetch(
      `${getAccountServiceApiBaseUrl()}/registration-policy`,
      { cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    const data = await response.json();
    if (
      !response.ok ||
      !["email", "open"].includes(data.mode) ||
      typeof data.emailVerificationRequired !== "boolean"
    ) {
      return NextResponse.json(
        { error: "registration_unavailable" },
        { status: 503, headers },
      );
    }
    return NextResponse.json(
      {
        mode: data.mode,
        emailVerificationRequired: data.emailVerificationRequired,
      },
      { headers },
    );
  } catch {
    return NextResponse.json(
      { error: "registration_unavailable" },
      { status: 503, headers },
    );
  }
}
