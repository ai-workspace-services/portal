"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type WorkspaceArtifact = {
  name?: string;
  path?: string;
  url?: string;
  mimeType?: string;
  size?: number;
};

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant" | "note";
  text: string;
  /** `Role · executor · model` above a Bot team answer. */
  header?: string;
  pending?: boolean;
  error?: boolean;
  link?: { href: string; label: string };
};

export type TaskItem = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  state: "idle" | "running" | "done" | "error";
  files: WorkspaceArtifact[];
  messages: ConversationMessage[];
};

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function newTask(): TaskItem {
  return {
    id: makeId("task"),
    title: "新对话",
    preview: "",
    updatedAt: Date.now(),
    state: "idle",
    files: [],
    messages: [],
  };
}

type WorkspaceShellValue = {
  /** Where the conversation pane lives: `/ai-workspace` or `/xworkmate`. */
  homeHref: string;
  tasks: TaskItem[];
  activeTaskId: string;
  selectTask: (id: string) => void;
  createTask: () => TaskItem;
  updateTask: (id: string, update: (task: TaskItem) => TaskItem) => void;
  sidebarHidden: boolean;
  setSidebarHidden: (hidden: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
};

const WorkspaceShellContext = createContext<WorkspaceShellValue | null>(null);

/**
 * State shared by the one workspace sidebar and the conversation pane: the
 * Gateway task list and whether the sidebar is shown. Held above both so the
 * sidebar is rendered once by the shell, never again inside a page.
 */
export function WorkspaceShellProvider({
  homeHref,
  initialTasks,
  children,
}: {
  homeHref: string;
  initialTasks?: () => TaskItem[];
  children: ReactNode;
}) {
  const [tasks, setTasks] = useState<TaskItem[]>(
    () => initialTasks?.() ?? [newTask()],
  );
  const [activeTaskId, setActiveTaskId] = useState(() => tasks[0]?.id ?? "");
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const createTask = useCallback(() => {
    const task = newTask();
    setTasks((current) => [task, ...current]);
    setActiveTaskId(task.id);
    return task;
  }, []);

  const updateTask = useCallback(
    (id: string, update: (task: TaskItem) => TaskItem) => {
      setTasks((current) =>
        current.map((task) =>
          task.id === id ? { ...update(task), updatedAt: Date.now() } : task,
        ),
      );
    },
    [],
  );

  const value = useMemo<WorkspaceShellValue>(
    () => ({
      homeHref,
      tasks,
      activeTaskId,
      selectTask: setActiveTaskId,
      createTask,
      updateTask,
      sidebarHidden,
      setSidebarHidden,
      mobileSidebarOpen,
      setMobileSidebarOpen,
    }),
    [
      homeHref,
      tasks,
      activeTaskId,
      createTask,
      updateTask,
      sidebarHidden,
      mobileSidebarOpen,
    ],
  );

  return (
    <WorkspaceShellContext.Provider value={value}>
      {children}
    </WorkspaceShellContext.Provider>
  );
}

export function useOptionalWorkspaceShell(): WorkspaceShellValue | null {
  return useContext(WorkspaceShellContext);
}

export function useWorkspaceShell(): WorkspaceShellValue {
  const value = useContext(WorkspaceShellContext);
  if (!value) {
    throw new Error("useWorkspaceShell must be used inside WorkspaceShellProvider");
  }
  return value;
}
