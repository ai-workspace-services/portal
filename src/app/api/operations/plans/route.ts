import { NextRequest, NextResponse } from "next/server";
import { getAccountSession } from "@server/account/session";
import { isOperationsUser } from "@server/account/adminAccess";
import { createSnapshotPlan } from "@/modules/extensions/builtin/platform-operations/lib/snapshot-plan";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 32 * 1024;
const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest): Promise<NextResponse> {
  const fail = (error: string, status: number) =>
    NextResponse.json({ error }, { status, headers });
  try {
    const session = await getAccountSession(request);
    if (!session.user || !session.token) return fail("unauthenticated", 401);
    if (!isOperationsUser(session.user)) return fail("forbidden", 403);
  } catch {
    return fail("session_unavailable", 503);
  }
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return fail("invalid_origin", 403);
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  )
    return fail("unsupported_media_type", 415);
  const length = request.headers.get("content-length");
  if (
    length !== null &&
    (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)
  )
    return fail("body_too_large", 413);
  const reader = request.body?.getReader();
  if (!reader) return fail("invalid_json", 400);
  let text = "";
  let bytes = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let input: unknown;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return fail("body_too_large", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    input = JSON.parse(text + decoder.decode());
  } catch {
    return fail("invalid_json", 400);
  } finally {
    reader.releaseLock();
  }
  if (!input || typeof input !== "object" || Array.isArray(input))
    return fail("invalid_plan_input", 400);
  try {
    const plan = createSnapshotPlan(
      input as Parameters<typeof createSnapshotPlan>[0],
    );
    return NextResponse.json(plan, { headers });
  } catch {
    // Validation must not reflect submitted secrets or internal exceptions.
    return fail("invalid_plan_input", 400);
  }
}
