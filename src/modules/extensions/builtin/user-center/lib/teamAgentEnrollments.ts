export type TeamAgentEnrollment = {
  agentId: string;
  suggestedTeamId: string;
  assignedTeamId: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  updatedAt: string;
  online: boolean;
  lastHeartbeat: string;
  region: string;
  entryPoint: string;
};
export async function teamAgentRequest<T>(
  url: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...(body
      ? {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  return data as T;
}
export function decideTeamAgent(
  agent: TeamAgentEnrollment,
  status: TeamAgentEnrollment["status"],
  teamId: string,
  reason: string,
): Promise<{ success: boolean }> {
  return teamAgentRequest("/api/admin/agents/team-enrollments", {
    agentId: agent.agentId,
    status,
    teamId: status === "approved" ? teamId : "",
    reason,
    updatedAt: agent.updatedAt,
  });
}
