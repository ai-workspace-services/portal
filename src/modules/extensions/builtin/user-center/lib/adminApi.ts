/**
 * Where the console reaches Accounts' admin handlers from the browser.
 *
 * The Frontend Router hands every `/api/*` request to the Edge Gateway, and
 * the gateway's core boundary explicitly disowns `/api/admin/*` (`ownsPath` in
 * edge-gateway `src/config.ts`). No admin gateway Worker is bound in GitOps,
 * so `/api/admin/...` answers `404 {"code":404,"error":"Unknown API boundary:
 * core"}` -- which surfaces only as an ops screen that fails to load.
 *
 * Accounts registers the same handlers under the auth boundary
 * (`authProtected.GET("/admin/billing/plans", ...)` in api/api.go), and the
 * router does route `/api/auth/*` to the gateway's auth boundary. The
 * `src/app/api/admin/**` BFF routes map this correctly but are never invoked:
 * the router never sends `/api/*` to an SSR boundary.
 *
 * Same fix as the management metrics in portal #254.
 */
export const ADMIN_API_BASE = "/api/auth/admin";
