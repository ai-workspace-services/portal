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

class TaskStore {
  private tasks: TaskItem[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('xworkmate_task_store');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Filter out hardcoded demo tasks if present
          this.tasks = Array.isArray(parsed) 
            ? parsed.filter((t: TaskItem) => !['1', '2', '3'].includes(t.id) && !t.title.includes('主页SEO优化') && !t.title.includes('管线测试复跑') && !t.title.includes('自媒体矩阵文案包'))
            : [];
          this.save();
        } catch {
          this.tasks = [];
        }
      } else {
        this.tasks = [];
        this.save();
      }
    } else {
      this.tasks = [];
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
    return () => {
      this.listeners.delete(listener);
    };
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
