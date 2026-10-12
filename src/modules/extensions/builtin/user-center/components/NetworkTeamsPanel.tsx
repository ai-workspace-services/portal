"use client";

import { useState } from "react";
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
};
type User = { id: string; name?: string; email?: string };
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
