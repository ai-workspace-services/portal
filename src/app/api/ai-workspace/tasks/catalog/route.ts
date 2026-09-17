import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOCAL_BRIDGE_URL = "http://127.0.0.1:8787";
const DEFAULT_BRIDGE_SERVER_URL = "https://xworkmate-bridge.svc.plus";

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization") || "";
  const clientBearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  const token =
    clientBearer ||
    process.env.AI_WORKSPACE_AUTH_TOKEN ||
    process.env.BRIDGE_AUTH_TOKEN ||
    "e0d32642a40b3c7a3d5791ce934c14c5504a03e938aaee34";

  // Try local bridge first, then configured bridge URL
  const candidateUrls = [
    LOCAL_BRIDGE_URL,
    process.env.BRIDGE_SERVER_URL?.trim().replace(/\/+$/, "") || DEFAULT_BRIDGE_SERVER_URL,
  ];

  for (const baseUrl of candidateUrls) {
    try {
      const target = `${baseUrl}/api/v1/agent/catalog`;
      const response = await fetch(target, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const body = await response.text();
        return new Response(body, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      }
    } catch {
      // Continue to next candidate or fallback
    }
  }

  // If upstream bridge is not reachable, return an empty but valid catalog response
  return Response.json(
    {
      ok: true,
      catalog: {
        pinnedTasks: [],
        sharedProjects: [],
        activeClaims: [],
      },
      warning: "Upstream bridge offline",
    },
    { status: 200 },
  );
}
