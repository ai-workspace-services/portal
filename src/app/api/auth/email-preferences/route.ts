import type { NextRequest } from "next/server";
import { proxyEmailPreferences } from "@server/account/emailPreferencesProxy";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) {
  return proxyEmailPreferences(request, false);
}
export function PUT(request: NextRequest) {
  return proxyEmailPreferences(request, false);
}
