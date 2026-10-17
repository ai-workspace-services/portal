// The public workspace entry is Free by default. Keep the implementation in
// one handler while exposing a product-facing path that does not use the
// retired "trial" terminology.
export {
  GET,
  POST,
} from "../trial/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
