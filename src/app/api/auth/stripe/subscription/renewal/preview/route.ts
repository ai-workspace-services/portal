import { NextRequest } from "next/server";
import { renewalProxy } from "../proxy";
export function POST(request: NextRequest) {
  return renewalProxy(request, true);
}
