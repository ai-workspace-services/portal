/**
 * Dynamic Workbench Projection logic ported from xworkmate-app (Flutter)
 */

export type WorkbenchItemState = 'blocked' | 'syncing' | 'running' | 'ready' | 'completed';

export interface TaskThread {
  id: string;
  sessionKey: string;
  title?: string;
  lifecycleStatus?: string;
  lastResultCode?: string;
  lastArtifactSyncStatus?: string;
  lastArtifactSyncAtMs?: number;
  lastRunAtMs?: number;
  updatedAtMs?: number;
  workspacePath?: string;
  artifactPaths?: string[];
  attachments?: { name: string; mimeType: string; uploadedAtMs?: number }[];
  messages?: { role: string; text: string; timestampMs?: number }[];
}

export interface WorkbenchItem {
  sessionKey: string;
  title: string;
  preview: string;
  projectLabel: string;
  updatedAtMs: number;
  state: WorkbenchItemState;
  progress: number;
  artifactPaths: string[];
  attachmentNames: string[];
  messageCount: number;
  thread?: TaskThread;
}

export interface WorkbenchProject {
  label: string;
  items: WorkbenchItem[];
  progress: number;
  artifactCount: number;
}

export interface WorkbenchInboxItem {
  sessionKey: string;
  title: string;
  subtitle: string;
  sourceTitle: string;
  updatedAtMs: number;
  kind: 'artifact' | 'attachment' | 'note';
}

export interface WorkbenchProjection {
  items: WorkbenchItem[];
  projects: WorkbenchProject[];
  inbox: WorkbenchInboxItem[];
  workloadSeries: { name: string; value: number }[];
  completedCount: number;
  totalPlannedCount: number;
  overallProgress: number;
}

export function buildWorkbenchProjection(threads: TaskThread[]): WorkbenchProjection {
  if (!threads || threads.length === 0) {
    // Return initial state if empty
    return {
      items: [],
      projects: [],
      inbox: [],
      workloadSeries: getEmptyWorkloadSeries(),
      completedCount: 0,
      totalPlannedCount: 0,
      overallProgress: 0,
    };
  }

  const items: WorkbenchItem[] = threads.map(thread => {
    const title = thread.title || thread.sessionKey || '未命名任务';
    const latestMessage = thread.messages?.slice(-1)[0];
    const preview = latestMessage?.text || thread.lastResultCode || '等待任务处理...';
    const updatedAtMs = thread.updatedAtMs || thread.lastRunAtMs || Date.now();
    const state = resolveState(thread);
    const progress = resolveProgress(state, thread);

    return {
      sessionKey: thread.sessionKey,
      title,
      preview,
      projectLabel: resolveProjectLabel(thread, title),
      updatedAtMs,
      state,
      progress: Math.round(progress * 100),
      artifactPaths: thread.artifactPaths || [],
      attachmentNames: thread.attachments?.map(a => a.name) || [],
      messageCount: thread.messages?.length || 0,
      thread,
    };
  }).sort((a, b) => b.updatedAtMs - a.updatedAtMs);

  // Group by project
  const projectsMap: Record<string, WorkbenchItem[]> = {};
  for (const item of items) {
    if (!projectsMap[item.projectLabel]) {
      projectsMap[item.projectLabel] = [];
    }
    projectsMap[item.projectLabel].push(item);
  }

  const projects: WorkbenchProject[] = Object.entries(projectsMap).map(([label, projectItems]) => {
    const avgProgress = projectItems.reduce((acc, cur) => acc + cur.progress, 0) / projectItems.length;
    const artifactCount = projectItems.reduce((acc, cur) => acc + cur.artifactPaths.length, 0);
    return {
      label,
      items: projectItems,
      progress: Math.round(avgProgress),
      artifactCount,
    };
  });

  // Build inbox items
  const inbox: WorkbenchInboxItem[] = [];
  for (const item of items) {
    for (const path of item.artifactPaths) {
      inbox.push({
        sessionKey: item.sessionKey,
        title: getFileName(path),
        subtitle: path,
        sourceTitle: item.title,
        updatedAtMs: item.thread?.lastArtifactSyncAtMs || item.updatedAtMs,
        kind: 'artifact',
      });
    }
  }

  // Workload series for 7 days
  const workloadSeries = buildWorkloadSeries(items);

  const completedCount = items.filter(i => i.state === 'completed').length;
  const totalPlannedCount = items.length;
  const overallProgress = totalPlannedCount > 0 ? Math.round((completedCount / totalPlannedCount) * 100) : 0;

  return {
    items,
    projects,
    inbox,
    workloadSeries,
    completedCount,
    totalPlannedCount,
    overallProgress,
  };
}

function resolveState(thread: TaskThread): WorkbenchItemState {
  const status = (thread.lifecycleStatus || '').toLowerCase();
  const sync = (thread.lastArtifactSyncStatus || '').toLowerCase();
  const result = (thread.lastResultCode || '').toLowerCase();

  if (status === 'failed' || sync === 'failed' || (result && result !== '0' && result !== 'success' && result !== 'completed')) {
    return 'blocked';
  }
  if (status === 'running') return 'running';
  if (status === 'syncing' || sync === 'syncing') return 'syncing';
  if (status === 'completed') return 'completed';
  return 'ready';
}

function resolveProgress(state: WorkbenchItemState, thread: TaskThread): number {
  switch (state) {
    case 'completed': return 1;
    case 'syncing': return 0.84;
    case 'running': return 0.64;
    case 'blocked': return 0.42;
    case 'ready': return (thread.messages && thread.messages.length > 0) ? 0.28 : 0.12;
  }
}

function resolveProjectLabel(thread: TaskThread, fallback: string): string {
  if (thread.workspacePath) {
    const parts = thread.workspacePath.replace(/\\/g, '/').split('/').filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return fallback;
}

function getFileName(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1] || path;
}

function getEmptyWorkloadSeries() {
  const dates = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push({ name: `${d.getMonth() + 1}/${d.getDate()}`, value: 0 });
  }
  return dates;
}

function buildWorkloadSeries(items: WorkbenchItem[]) {
  const now = new Date();
  const dates: { name: string; date: Date; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    dates.push({ name: `${d.getMonth() + 1}/${d.getDate()}`, date: d, value: 0 });
  }

  for (const item of items) {
    const eventDate = new Date(item.updatedAtMs);
    const dayIndex = dates.findIndex(
      d => d.date.getFullYear() === eventDate.getFullYear() &&
           d.date.getMonth() === eventDate.getMonth() &&
           d.date.getDate() === eventDate.getDate()
    );
    if (dayIndex !== -1) {
      dates[dayIndex].value += 1;
    }
  }

  return dates.map(d => ({ name: d.name, value: d.value }));
}
