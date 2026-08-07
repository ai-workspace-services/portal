"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, Settings, Languages, Sun, ChevronsLeft, CheckSquare, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskStore, type TaskItem } from '@/lib/xworkmate/taskStore';

interface SidebarProps {
  onHide?: () => void;
}

export default function Sidebar({ onHide }: SidebarProps) {
  const pathname = usePathname();
  const [tasks, setTasks] = useState<TaskItem[]>([]);

  useEffect(() => {
    setTasks(taskStore.getTasks());
    const unsubscribe = taskStore.subscribe(() => {
      setTasks([...taskStore.getTasks()]);
    });
    return unsubscribe;
  }, []);

  return (
    <aside className="w-64 bg-[#f7f7f8] flex flex-col h-full border-r border-gray-200 flex-shrink-0 transition-all duration-300 ease-in-out">
      {/* Top Logo / Collapse */}
      <div className="p-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-2 px-2">
          <div className="w-6 h-6 bg-gray-900 text-white rounded flex items-center justify-center font-bold text-xs">X</div>
          <span className="font-bold text-gray-900">XWorkmate</span>
        </div>
        {onHide && (
          <button 
            onClick={onHide} 
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-md transition-colors"
            title="收起边栏"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Actions */}
      <div className="px-3 space-y-2 mt-2">
        <Link 
          href="/ai-workspace" 
          className={cn(
            "flex items-center gap-2.5 w-full py-2.5 px-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm"
          )}
        >
          <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">工作台</span>
        </Link>
        <Link 
          href="/ai-workspace/conversation/new" 
          className={cn(
            "flex items-center gap-2.5 w-full py-2.5 px-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm"
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">新对话</span>
        </Link>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 mt-6">
        <div className="space-y-1">
          <NavItem 
            href="/ai-workspace/tasks" 
            icon={CheckSquare} 
            title="任务列表" 
            active={pathname === '/ai-workspace/tasks'} 
          />
          
          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-gray-400">最近对话</div>
          
          {tasks.map(task => (
            <NavItem 
              key={task.sessionKey}
              href={`/ai-workspace/conversation/${task.sessionKey}`}
              icon={MessageSquare} 
              title={task.title} 
              active={pathname === `/ai-workspace/conversation/${task.sessionKey}`} 
            />
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-gray-200/60 space-y-1">
        <button className="flex items-center gap-3 w-full p-2 text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors text-sm">
          <Settings className="w-4 h-4" />
          <span className="flex-1 text-left">设置</span>
        </button>
        <button className="flex items-center gap-3 w-full p-2 text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors text-sm">
          <Languages className="w-4 h-4" />
          <span className="flex-1 text-left">语言</span>
          <span className="text-xs px-2 py-0.5 bg-gray-200/60 rounded-md">中</span>
        </button>
        <button className="flex items-center gap-3 w-full p-2 text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors text-sm">
          <Sun className="w-4 h-4" />
          <span className="flex-1 text-left">主题</span>
          <span className="text-xs px-2 py-0.5 bg-gray-200/60 rounded-md">跟随</span>
        </button>
      </div>
    </aside>
  );
}

function NavItem({ href, icon: Icon, title, active }: { href: string, icon: any, title: string, active?: boolean }) {
  return (
    <Link 
      href={href}
      className={cn(
        "flex items-center gap-3 w-full py-2 px-3 rounded-xl transition-colors text-sm",
        active ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-200/50"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
      <span className="flex-1 truncate">{title}</span>
    </Link>
  );
}
