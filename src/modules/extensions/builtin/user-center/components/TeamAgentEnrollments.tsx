"use client";

import { useState } from "react";
import useSWR from "swr";
import content from "@/data/content/team-agent-enrollments.json";
import { useUserStore } from "@lib/userStore";
import {
  decideTeamAgent,
  teamAgentRequest,
  type TeamAgentEnrollment,
} from "../lib/teamAgentEnrollments";

type Team = { id: string; name: string };
const endpoint = "/api/admin/agents/team-enrollments";

export default function TeamAgentEnrollments({ zh }: { zh: boolean }) {
  const copy = content[zh ? "zh" : "en"];
  const account = useUserStore((state) => state.user);
  const canInspect = Boolean(
    account?.isAdmin || account?.isRoot || account?.isOperator,
  );
  const agents = useSWR<{ agents: TeamAgentEnrollment[] }>(
    canInspect ? endpoint : null,
    teamAgentRequest,
    { refreshInterval: 30_000 },
  );
  const teams = useSWR<{ teams: Team[] }>(
    account?.isRoot ? "/api/admin/network-teams" : null,
    teamAgentRequest,
  );
  if (!canInspect) return null;
  return (
    <section className="mt-6 rounded-xl border p-6" aria-label="Team agents">
      <h2 className="text-xl font-semibold">{copy.title}</h2>
      {agents.error ? <p role="alert">{agents.error.message}</p> : null}
      {teams.error ? <p role="alert">{teams.error.message}</p> : null}
      {agents.isLoading ? <p role="status">{copy.loading}</p> : null}
      {agents.data?.agents.length === 0 ? <p>{copy.empty}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Agent ID</th>
              <th>{copy.onlineRegion}</th>
              <th>{copy.suggestedTeam}</th>
              <th>{copy.statusAssignedTeam}</th>
              <th>{copy.actions}</th>
            </tr>
          </thead>
          <tbody>
            {agents.data?.agents.map((agent) => (
              <EnrollmentRow
                key={agent.agentId + agent.updatedAt}
                agent={agent}
                teams={teams.data?.teams ?? []}
                canManage={Boolean(account?.isRoot)}
                zh={zh}
                refresh={async () => {
                  await agents.mutate();
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
function EnrollmentRow({
  agent,
  teams,
  canManage,
  zh,
  refresh,
}: {
  agent: TeamAgentEnrollment;
  teams: Team[];
  canManage: boolean;
  zh: boolean;
  refresh: () => Promise<void>;
}) {
  const copy = content[zh ? "zh" : "en"];
  const initial = agent.assignedTeamId || agent.suggestedTeamId;
  const [teamId, setTeamId] = useState(
    teams.some((team) => team.id === initial) ? initial : "",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const labels = {
    pending: copy.pending,
    approved: copy.approved,
    rejected: copy.rejected,
    revoked: copy.revoked,
  };
  async function decide(status: TeamAgentEnrollment["status"]): Promise<void> {
    setBusy(true);
    setError("");
    try {
      await decideTeamAgent(agent, status, teamId, reason);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }
  return (
    <tr className="border-t align-top">
      <td className="py-3">
        {agent.agentId}
        <br />
        {agent.entryPoint}
      </td>
      <td>
        {agent.online ? copy.online : copy.offline} / {agent.region || "—"}
      </td>
      <td>{agent.suggestedTeamId || "—"}</td>
      <td>
        {labels[agent.status]} / {agent.assignedTeamId || "—"}
      </td>
      <td>
        {canManage ? (
          <div className="flex min-w-64 flex-col gap-2">
            <select
              aria-label="Team ID"
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              disabled={busy || agent.status === "approved"}
            >
              <option value="">{copy.selectTeam}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name} ({team.id})
                </option>
              ))}
            </select>
            <input
              aria-label={copy.reason}
              placeholder={copy.reasonPlaceholder}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={busy}
            />
            <div className="flex gap-3">
              <button
                type="button"
                disabled={
                  busy ||
                  !teamId ||
                  !reason.trim() ||
                  agent.status === "approved"
                }
                onClick={() => void decide("approved")}
              >
                {copy.approve}
              </button>
              <button
                type="button"
                disabled={busy || !reason.trim() || agent.status === "approved"}
                onClick={() => void decide("rejected")}
              >
                {copy.reject}
              </button>
              <button
                type="button"
                disabled={busy || !reason.trim() || agent.status !== "approved"}
                onClick={() => void decide("revoked")}
              >
                {copy.revoke}
              </button>
            </div>
            {error ? <p role="alert">{error}</p> : null}
          </div>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
