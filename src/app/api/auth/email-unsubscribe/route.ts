import type { NextRequest } from "next/server";
import { proxyEmailPreferences } from "@server/account/emailPreferencesProxy";
export const dynamic = "force-dynamic";
export function POST(request: NextRequest) {
  return proxyEmailPreferences(request, true);
}
