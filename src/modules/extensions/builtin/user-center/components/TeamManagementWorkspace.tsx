"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import {
  Check,
  ChevronRight,
  CirclePause,
  CirclePlay,
  MailPlus,
  Search,
  Server,
  ShieldCheck,
  Trash2,
  UsersRound,
} from "lucide-react";

import { useUserStore } from "@lib/userStore";
import { fetchAgentNodes } from "../lib/fetchAgentNodes";
import type { VlessNode } from "../lib/vless";

type Team = {
  id: string;
  name: string;
  memberLimit: number;
  validFrom: string;
  validUntil: string;
  active: boolean;
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  quotaGroup?: string;
  quotaLabel?: string;
  accessState: "active" | "paused" | string;
  active: boolean;
};

type TeamResponse = {
  team: Team;
  members: TeamMember[];
  canManage: boolean;
  quotaGroups: string[];
};

const quotaOptions = [
  { value: "5gb", label: "5 GB / 月" },
  { value: "20gb", label: "20 GB / 月" },
  { value: "unlimited", label: "无限额度" },
] as const;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string; message?: string }
    | T
    | null;
  if (!response.ok) {
    const error = payload && typeof payload === "object" && "error" in payload
      ? payload.error
      : undefined;
    const message = payload && typeof payload === "object" && "message" in payload
      ? payload.message
      : undefined;
    throw new Error(error || message || `请求失败（${response.status}）`);
  }
  return payload as T;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("zh-CN");
}

function initials(member: TeamMember) {
  return (member.name || member.email || "成员").slice(0, 1).toUpperCase();
}

export default function TeamManagementWorkspace() {
  const account = useUserStore((state) => state.user);
  const [space, setSpace] = useState<"team" | "personal">("team");
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyID, setBusyID] = useState<string | null>(null);

  const team = useSWR<TeamResponse>(
    account && space === "team" ? "/api/auth/network-team" : null,
    fetchJson,
    { revalidateOnFocus: false },
  );
  const nodes = useSWR<VlessNode[]>(
    account && space === "team" ? ["team-nodes", account.id] : null,
    fetchAgentNodes,
    { refreshInterval: 30_000, revalidateOnFocus: false },
  );

  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return team.data?.members ?? [];
    return (team.data?.members ?? []).filter((member) =>
      [member.name, member.email].some((value) =>
        value.toLowerCase().includes(needle),
      ),
    );
  }, [search, team.data?.members]);

  async function mutateMember(member: TeamMember, body: Record<string, unknown>) {
    setBusyID(member.id);
    setNotice("");
    try {
      await fetchJson(`/api/auth/network-team/members/${encodeURIComponent(member.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await team.mutate();
      setNotice("成员设置已保存");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "保存失败");
    } finally {
      setBusyID(null);
    }
  }

  async function removeMember(member: TeamMember) {
    if (!window.confirm(`确定移除 ${member.name || member.email} 吗？`)) return;
    setBusyID(member.id);
    setNotice("");
    try {
      await fetchJson(`/api/auth/network-team/members/${encodeURIComponent(member.id)}`, {
        method: "DELETE",
      });
      await team.mutate();
      setNotice("成员已移出团队");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "移除失败");
    } finally {
      setBusyID(null);
    }
  }

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteError("");
    try {
      await fetchJson("/api/auth/network-team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      await team.mutate();
      setInviteEmail("");
      setInviteOpen(false);
      setNotice("成员已加入团队");
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "添加成员失败");
    }
  }

  if (space === "personal") {
    return (
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <SpaceSwitcher space={space} onChange={setSpace} />
        <section className="xds-card space-y-3 p-6">
          <p className="text-sm font-medium text-slate-500">个人共享空间</p>
          <h1 className="text-2xl font-semibold text-slate-950">个人资源</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            个人共享版订阅与团队版订阅相互独立。切换到团队空间后，只会加载当前团队的专属节点和成员。
          </p>
          <a className="xds-btn xds-btn-secondary inline-flex" href="/panel/subscription">
            查看订阅
            <ChevronRight size={16} />
          </a>
        </section>
      </main>
    );
  }

  if (team.error) {
    const forbidden = team.error.message.includes("team_admin_required") ||
      team.error.message.includes("403");
    return (
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <SpaceSwitcher space={space} onChange={setSpace} />
        <section className="xds-card space-y-3 p-6" role="alert">
          <ShieldCheck className="text-slate-500" size={24} />
          <h1 className="text-xl font-semibold text-slate-950">
            {forbidden ? "需要团队管理员权限" : "团队空间暂时不可用"}
          </h1>
          <p className="text-sm text-slate-600">
            {forbidden
              ? "请使用当前团队的管理员账号访问成员和资源管理。其他团队与公共共享资源不会出现在这里。"
              : team.error.message}
          </p>
        </section>
      </main>
    );
  }

  const teamData = team.data;
  const currentID = account?.id;
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <SpaceSwitcher space={space} onChange={setSpace} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">团队版</p>
          <h1 className="text-2xl font-semibold text-slate-950">{teamData?.team.name ?? "团队资源管理"}</h1>
          <p className="mt-1 text-sm text-slate-600">团队专属节点、成员和访问状态集中管理。</p>
        </div>
        <button className="xds-btn xds-btn-primary" type="button" onClick={() => setInviteOpen(true)}>
          <MailPlus size={16} /> 添加成员
        </button>
      </header>

      {notice ? <p className="xds-alert" role="status">{notice}</p> : null}
      {team.isLoading ? <p className="text-sm text-slate-500">正在加载团队数据…</p> : null}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="专属节点" value={nodes.error ? "不可用" : String(nodes.data?.length ?? "—")} detail="仅显示当前团队节点" icon={<Server size={18} />} />
        <SummaryCard label="团队成员" value={`${teamData?.members.length ?? "—"} / ${teamData?.team.memberLimit ?? "—"}`} detail="成员列表按团队隔离" icon={<UsersRound size={18} />} />
        <SummaryCard label="团队订阅" value={teamData?.team.active ? "生效中" : "已暂停"} detail={`${formatDate(teamData?.team.validFrom ?? "")} – ${formatDate(teamData?.team.validUntil ?? "")}`} icon={<ShieldCheck size={18} />} />
      </section>

      <section className="xds-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold text-slate-950">专属资源</h2><p className="mt-1 text-xs text-slate-500">公共和其他团队资源不会显示在此处。</p></div>
          <a className="xds-btn xds-btn-secondary" href="/panel/subscription">管理订阅 <ChevronRight size={15} /></a>
        </div>
        <div className="divide-y divide-slate-100">
          {nodes.error ? <p className="p-5 text-sm text-amber-700">专属节点暂时不可用，页面不会回退到公共节点。</p> : null}
          {!nodes.error && nodes.data?.length === 0 ? <p className="p-5 text-sm text-slate-500">当前没有可用的专属节点。</p> : null}
          {nodes.data?.map((node) => <ResourceRow key={`${node.address}-${node.port}`} node={node} />)}
        </div>
      </section>

      <section className="xds-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold text-slate-950">团队成员</h2><p className="mt-1 text-xs text-slate-500">管理员可以调整成员额度、暂停或启用访问。</p></div>
          <label className="relative block w-full sm:w-64"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><span className="sr-only">搜索成员</span><input className="xds-input pl-9" placeholder="搜索姓名或邮箱" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredMembers.map((member) => {
            const self = member.id === currentID;
            const busy = busyID === member.id;
            return <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between" key={member.id}>
              <div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 font-semibold text-blue-700">{initials(member)}</div><div className="min-w-0"><p className="truncate font-medium text-slate-900">{member.name || "未命名成员"} {self ? <span className="xds-badge ml-1">管理员</span> : null}</p><p className="truncate text-sm text-slate-500">{member.email}</p></div></div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className={`xds-badge ${member.accessState === "paused" ? "xds-badge-warning" : "xds-badge-success"}`}>{member.accessState === "paused" ? "已暂停" : "已启用"}</span>
                <select aria-label={`${member.name || member.email} 的额度`} className="xds-input w-36" disabled={self || busy} value={member.quotaGroup || "5gb"} onChange={(event) => void mutateMember(member, { quotaGroup: event.target.value })}>
                  {quotaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                {!self ? <>
                  <button className="xds-btn xds-btn-secondary" type="button" disabled={busy} onClick={() => void mutateMember(member, { paused: member.accessState !== "paused" })}>{member.accessState === "paused" ? <CirclePlay size={15} /> : <CirclePause size={15} />}{member.accessState === "paused" ? "启用" : "暂停"}</button>
                  <button className="xds-btn xds-btn-secondary text-rose-700" type="button" disabled={busy} onClick={() => void removeMember(member)}><Trash2 size={15} />移除</button>
                </> : <span className="text-xs text-slate-500">当前管理员</span>}
              </div>
            </div>;
          })}
          {!team.isLoading && filteredMembers.length === 0 ? <p className="p-5 text-sm text-slate-500">没有匹配的成员。</p> : null}
        </div>
      </section>

      {inviteOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4" role="dialog" aria-modal="true" aria-labelledby="invite-title"><form className="xds-card w-full max-w-md space-y-5 p-6" onSubmit={inviteMember}><div><h2 id="invite-title" className="text-lg font-semibold text-slate-950">添加团队成员</h2><p className="mt-1 text-sm text-slate-500">输入已注册账号的邮箱，成员会立即获得当前团队的专属访问。</p></div><label className="block text-sm font-medium text-slate-700">成员邮箱<input className="xds-input mt-2" type="email" required autoFocus value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} /></label>{inviteError ? <p className="text-sm text-rose-700" role="alert">{inviteError}</p> : null}<div className="flex justify-end gap-2"><button className="xds-btn xds-btn-secondary" type="button" onClick={() => setInviteOpen(false)}>取消</button><button className="xds-btn xds-btn-primary" type="submit">确认添加</button></div></form></div> : null}
    </main>
  );
}

function SpaceSwitcher({ space, onChange }: { space: "team" | "personal"; onChange: (value: "team" | "personal") => void }) {
  return <div className="flex w-fit items-center gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="资源空间"><button className={`rounded-md px-3 py-2 text-sm ${space === "team" ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500"}`} role="tab" aria-selected={space === "team"} type="button" onClick={() => onChange("team")}>团队空间</button><button className={`rounded-md px-3 py-2 text-sm ${space === "personal" ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-500"}`} role="tab" aria-selected={space === "personal"} type="button" onClick={() => onChange("personal")}>个人空间</button></div>;
}

function SummaryCard({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: React.ReactNode }) {
  return <div className="xds-card space-y-3 p-5"><div className="flex items-center justify-between text-slate-500"><span className="text-sm">{label}</span>{icon}</div><p className="text-2xl font-semibold text-slate-950">{value}</p><p className="text-xs text-slate-500">{detail}</p></div>;
}

function ResourceRow({ node }: { node: VlessNode }) {
  return <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><Server size={18} /></div><div><p className="font-medium text-slate-900">{node.name || node.region || node.address}</p><p className="text-sm text-slate-500">{node.region || "专属区域"} · {node.address}:{node.port}</p></div></div><span className="xds-badge xds-badge-success"><Check size={13} />可用</span></div>;
}
