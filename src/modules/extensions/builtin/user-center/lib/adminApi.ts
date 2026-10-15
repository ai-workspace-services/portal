/**
 * Browser admin requests use Accounts' auth boundary in every deployment.
 * Serverless routes it at the gateway; Selfhost's Next route forwards the
 * authenticated console session and preserves Accounts' authorization result.
 */
export const ADMIN_API_BASE = "/api/auth/admin";
