// Keep the browser's auth boundary working on selfhost as well as serverless.
// Reuse the BFF's session and admin permission checks on the Node runtime.
export const dynamic = "force-dynamic";

export { GET } from "@/app/api/admin/users/metrics/route";
