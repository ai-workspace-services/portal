import { NextRequest } from "next/server";
import { renewalProxy } from "./proxy";
export function GET(request: NextRequest) {
  return renewalProxy(request);
}
export function POST(request: NextRequest) {
  return renewalProxy(request);
}
