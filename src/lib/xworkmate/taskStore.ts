/**
 * Client-side Task & Session Store for reactive task synchronization
 */

export interface TaskItem {
  id: string;
  sessionKey: string;
  title: string;
  preview: string;
  projectLabel: string;
  updatedAtMs: number;
  status: 'ready' | 'running' | 'completed' | 'blocked';
  progress: number;
  artifactPaths: string[];
}

const INITIAL_TASKS: TaskItem[] = [
  { id: '1', sessionKey: 'draft-1785823210227642-1', title: '主页SEO优化', preview: '已完成。基于最终品牌树...', projectLabel: 'SEO项目', updatedAtMs: Date.now() - 480000, status: 'completed', progress: 100, artifactPaths: ['seo_plan.md'] },
  { id: '2', sessionKey: 'draft-178590624986936-1', title: '管线测试复跑', preview: '写好了，围绕「1000万以内最好的...」', projectLabel: '测试', updatedAtMs: Date.now() - 600000, status: 'running', progress: 45, artifactPaths: [] },
  { id: '3', sessionKey: 'draft-178574641044258-1', title: '自媒体矩阵文案包', preview: '已完成整理，矩阵文案包写好了...', projectLabel: '文案矩阵', updatedAtMs: Date.now() - 720000, status: 'ready', progress: 28, artifactPaths: ['draft1.md', 'draft2.md'] },
];

class TaskStore {
  private tasks: TaskItem[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('xworkmate_task_store');
      if (stored) {
        try {
          this.tasks = JSON.parse(stored);
        } catch {
          this.tasks = INITIAL_TASKS;
        }
      } else {
        this.tasks = INITIAL_TASKS;
        this.save();
      }
    } else {
      this.tasks = INITIAL_TASKS;
    }
  }

  private save() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xworkmate_task_store', JSON.stringify(this.tasks));
    }
  }

  private notify() {
    this.save();
    this.listeners.forEach(fn => fn());
  }

  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getTasks(): TaskItem[] {
    return this.tasks;
  }

  public addTask(title: string, promptText: string): TaskItem {
    const timestamp = Date.now();
    const sessionKey = `draft-${timestamp}`;
    const cleanTitle = title.trim() ? (title.length > 20 ? title.substring(0, 20) + '...' : title) : '新对话任务';
    
    const newTask: TaskItem = {
      id: String(timestamp),
      sessionKey,
      title: cleanTitle,
      preview: promptText.trim() ? (promptText.length > 30 ? promptText.substring(0, 30) + '...' : promptText) : '新对话已启动',
      projectLabel: '通用专项',
      updatedAtMs: timestamp,
      status: 'running',
      progress: 15,
      artifactPaths: [],
    };

    this.tasks = [newTask, ...this.tasks];
    this.notify();

    // Post to proxy API asynchronously
    fetch('/api/ai-workspace/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    }).catch(err => console.warn('Sync to bridge proxy failed', err));

    return newTask;
  }
}

export const taskStore = new TaskStore();
