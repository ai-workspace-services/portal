"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import BoundaryLink from "@/components/common/BoundaryLink";
import { useLanguage } from "@i18n/LanguageProvider";
import { useUserStore } from "@lib/userStore";
import content from "@/data/content/xconnect.json";
import type { XConnectContent } from "@/lib/xconnectContent";
import { fetchAgentNodes } from "../lib/fetchAgentNodes";

type Team = {
  id: string;
  name: string;
  memberLimit: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
};
function localDateTime(raw: string): string {
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}
type Access = {
  mode: "personal" | "dedicated";
  teamId?: string;
  team?: Team;
  allowed: boolean;
  role?: "admin" | "member";
};
type User = { id: string; name?: string; email?: string };
type TeamMembershipSummary = {
  teamId: string;
  memberCount: number;
};
async function request<T>(url: string, body?: unknown): Promise<T> {
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
  return data;
}

export default function NetworkTeamsPanel({ users }: { users?: User[] }) {
  const { language } = useLanguage();
  const copy = (content as XConnectContent)[language === "en" ? "en" : "zh"]
    .team;
  const account = useUserStore((s) => s.user);
  const access = useSWR<Access>(
    account ? ["network-access", account.id] : null,
    () => request<Access>("/api/auth/network-access"),
    { refreshInterval: 30_000 },
  );
  const nodes = useSWR(
    account ? ["team-nodes", account.id] : null,
    fetchAgentNodes,
    { refreshInterval: 30_000 },
  );
  const teams = useSWR<{ teams: Team[] }>(users ? "network-teams" : null, () =>
    request<{ teams: Team[] }>("/api/admin/network-teams"),
  );
  const teamMemberships = useSWR<Array<Access | null>>(
    users ? ["network-team-memberships", users.map((user) => user.id)] : null,
    async () =>
      Promise.all(
        (users ?? []).map(async (user) => {
          try {
            return await request<Access>(
              `/api/admin/users/${encodeURIComponent(user.id)}/network-access`,
            );
          } catch {
            return null;
          }
        }),
      ),
    { revalidateOnFocus: false },
  );
  const [team, setTeam] = useState<Team>({
    id: "",
    name: "",
    memberLimit: 30,
    validFrom: "",
    validUntil: "",
    active: false,
  });
  const [userId, setUserId] = useState("");
  const [membership, setMembership] = useState<string | null>(null);
  const [memberRole, setMemberRole] = useState<"admin" | "member" | null>(null);
  const member = useSWR<Access>(
    userId
      ? `/api/admin/users/${encodeURIComponent(userId)}/network-access`
      : null,
    (url: string) => request<Access>(url),
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const chosen =
    membership ??
    (member.data?.mode === "dedicated"
      ? member.data.teamId || "@removed"
      : "@personal");
  const membershipSummary = useMemo<TeamMembershipSummary[]>(() => {
    const counts = new Map<string, number>();
    for (const membership of teamMemberships.data ?? []) {
      if (!membership) continue;
      if (membership.mode === "dedicated" && membership.teamId) {
        counts.set(membership.teamId, (counts.get(membership.teamId) ?? 0) + 1);
      }
    }
    return (teams.data?.teams ?? []).map((team) => ({
      teamId: team.id,
      memberCount: counts.get(team.id) ?? 0,
    }));
  }, [teamMemberships.data, teams.data?.teams]);
  const membershipsComplete =
    teamMemberships.data?.length === (users?.length ?? 0) &&
    teamMemberships.data.every((membership) => membership !== null);
  const teamMemberCount = membershipsComplete
    ? teamMemberships.data?.filter(
        (membership): membership is Access =>
          membership !== null &&
          membership.mode === "dedicated" &&
          Boolean(membership.teamId),
      ).length
    : undefined;
  const activeTeamCount = teams.data?.teams.filter(
    (team) => team.active,
  ).length;
  const save = async (url: string, body: unknown): Promise<void> => {
    setSaving(true);
    setError("");
    try {
      await request(url, body);
      await teams.mutate();
      await member.mutate();
      await access.mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSaving(false);
    }
  };

  if (!copy) return null;
  return (
    <section className="xds-card p-5 space-y-4">
      <h2 className="text-lg font-semibold">
        {users ? copy.manageTitle : copy.title}
      </h2>
      <p>{copy.description}</p>
      {access.data?.mode === "dedicated" && !access.error ? (
        <dl className="grid gap-2 sm:grid-cols-3">
          <div>
            <dt>{copy.nodesLabel}</dt>
            <dd>
              {nodes.error ? copy.unavailable : (nodes.data?.length ?? "—")}
            </dd>
          </div>
          <div>
            <dt>{copy.membersLabel}</dt>
            <dd>{access.data.team?.memberLimit ?? "—"}</dd>
          </div>
          <div>
            <dt>{copy.validityLabel}</dt>
            <dd>
              {access.data.team
                ? `${access.data.team.validFrom} – ${access.data.team.validUntil}`
                : "—"}
            </dd>
          </div>
        </dl>
      ) : null}
      {access.data?.mode === "dedicated" && !access.data.allowed ? (
        <p role="status">{copy.unavailable}</p>
      ) : null}
      <BoundaryLink
        href={copy.contactHref}
        className="xds-btn xds-btn-secondary"
      >
        {copy.contactLabel}
      </BoundaryLink>
      {users ? (
        <>
          {teams.error ? <p role="alert">{teams.error.message}</p> : null}
          <section
            aria-label="团队分组统计"
            className="rounded-md border border-[color:var(--color-surface-border)] bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--color-heading)]">
                  {copy.statsTitle}
                </h3>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  {copy.statsDescription}
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                {teams.isLoading
                  ? copy.loadingLabel
                  : `${copy.teamCountLabel} ${teams.data?.teams.length ?? "—"}`}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">
                  {copy.activeTeamsLabel}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-[var(--color-heading)]">
                  {teams.isLoading ? "—" : (activeTeamCount ?? "—")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">
                  {copy.teamMembersCountLabel}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-[var(--color-heading)]">
                  {teamMemberships.isLoading ? "—" : (teamMemberCount ?? "—")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--color-text-muted)]">
                  {copy.unassignedMembersLabel}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-[var(--color-heading)]">
                  {teamMemberships.isLoading || teamMemberCount === undefined
                    ? "—"
                    : Math.max(users.length - teamMemberCount, 0)}
                </dd>
              </div>
            </dl>
            {teams.data?.teams.length ? (
              <div className="mt-4 space-y-2">
                {teams.data.teams.map((item) => {
                  const summary = membershipSummary.find(
                    (entry) => entry.teamId === item.id,
                  );
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-[var(--color-heading)]">
                        {item.name}
                      </span>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {teamMemberships.isLoading || !membershipsComplete
                          ? copy.membersUnknownLabel
                          : `${copy.teamMembersCountLabel} ${summary?.memberCount ?? 0} / ${item.memberLimit}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : teams.isLoading ? (
              <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                {copy.loadingLabel}
              </p>
            ) : (
              <p className="mt-4 text-sm text-[var(--color-text-muted)]">
                {copy.emptyLabel}
              </p>
            )}
          </section>
          <label>
            {copy.selectLabel}
            <select
              className="xds-input"
              value={team.id}
              onChange={(e) =>
                setTeam(
                  teams.data?.teams.find((t) => t.id === e.target.value) ?? {
                    id: "",
                    name: "",
                    memberLimit: 30,
                    validFrom: "",
                    validUntil: "",
                    active: false,
                  },
                )
              }
            >
              <option value="">{copy.newTeamLabel}</option>
              {teams.data?.teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              {copy.idLabel}
              <input
                className="xds-input"
                value={team.id}
                onChange={(e) => setTeam({ ...team, id: e.target.value })}
              />
            </label>
            <label>
              {copy.nameLabel}
              <input
                className="xds-input"
                value={team.name}
                onChange={(e) => setTeam({ ...team, name: e.target.value })}
              />
            </label>
            <label>
              {copy.membersLabel}
              <input
                className="xds-input"
                type="number"
                min={1}
                value={team.memberLimit}
                onChange={(e) =>
                  setTeam({ ...team, memberLimit: Number(e.target.value) })
                }
              />
            </label>
            <label>
              {copy.fromLabel}
              <input
                className="xds-input"
                type="datetime-local"
                value={team.validFrom ? localDateTime(team.validFrom) : ""}
                onChange={(e) =>
                  setTeam({ ...team, validFrom: e.target.value })
                }
              />
            </label>
            <label>
              {copy.untilLabel}
              <input
                className="xds-input"
                type="datetime-local"
                value={team.validUntil ? localDateTime(team.validUntil) : ""}
                onChange={(e) =>
                  setTeam({ ...team, validUntil: e.target.value })
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={team.active}
                onChange={(e) => setTeam({ ...team, active: e.target.checked })}
              />{" "}
              {copy.activeLabel}
            </label>
          </div>
          <label>
            {copy.reasonLabel}
            <input
              className="xds-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button
            className="xds-btn xds-btn-primary"
            disabled={
              saving ||
              !reason.trim() ||
              !team.id ||
              !team.name ||
              !team.validFrom ||
              !team.validUntil
            }
            onClick={() =>
              void save(
                `/api/admin/network-teams/${encodeURIComponent(team.id)}`,
                {
                  ...team,
                  validFrom: new Date(team.validFrom).toISOString(),
                  validUntil: new Date(team.validUntil).toISOString(),
                  reason,
                },
              )
            }
          >
            {copy.saveTeamLabel}
          </button>
          <label>
            {copy.userLabel}
            <select
              className="xds-input"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setMembership(null);
                setMemberRole(null);
              }}
            >
              <option value="">—</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.email || u.id}
                </option>
              ))}
            </select>
          </label>
          {userId ? (
            <label>
              {copy.modeLabel}
              <select
                className="xds-input"
                value={chosen}
                disabled={!member.data || !!member.error}
                onChange={(e) => setMembership(e.target.value)}
              >
                <option value="@personal">{copy.personalLabel}</option>
                <option value="@removed">{copy.removedLabel}</option>
                {teams.data?.teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {member.error ? <p role="alert">{member.error.message}</p> : null}
          {userId && chosen !== "@personal" && chosen !== "@removed" ? (
            <select
              className="xds-input"
              aria-label="team role"
              value={memberRole ?? member.data?.role ?? "member"}
              onChange={(e) =>
                setMemberRole(e.target.value as "admin" | "member")
              }
            >
              <option value="admin">team-admin</option>
              <option value="member">member</option>
            </select>
          ) : null}
          <button
            className="xds-btn xds-btn-secondary"
            disabled={
              saving ||
              !userId ||
              !reason.trim() ||
              !member.data ||
              !!member.error
            }
            onClick={() =>
              void save(
                `/api/admin/users/${encodeURIComponent(userId)}/network-access`,
                {
                  mode: chosen === "@personal" ? "personal" : "dedicated",
                  teamId:
                    chosen === "@personal" || chosen === "@removed"
                      ? ""
                      : chosen,
                  role:
                    chosen === "@personal" || chosen === "@removed"
                      ? "member"
                      : (memberRole ?? member.data?.role ?? "member"),
                  reason,
                },
              )
            }
          >
            {copy.saveMemberLabel}
          </button>
        </>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
