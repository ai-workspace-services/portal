"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, Settings, Languages, Sun, ChevronsLeft, Search, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskStore, type TaskItem } from '@/lib/xworkmate/taskStore';

interface SidebarProps {
  onHide?: () => void;
}

export default function Sidebar({ onHide }: SidebarProps) {
  const pathname = usePathname();
  const [isTrialEntry, setIsTrialEntry] = useState(false);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsTrialEntry(new URLSearchParams(window.location.search).get('entry') === 'trial');
    setTasks(taskStore.getTasks());
    const unsubscribe = taskStore.subscribe(() => {
      setTasks([...taskStore.getTasks()]);
    });
    return unsubscribe;
  }, []);

  const filteredTasks = (isTrialEntry ? [] : tasks).filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-64 shrink-0 bg-[#f7f7f8] flex flex-col h-full border-r border-gray-200/80 transition-all duration-300 ease-in-out">
      {/* Top Search & Collapse */}
      <div className="p-3 pb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索任务"
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
        {onHide && (
          <button 
            onClick={onHide} 
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors flex-shrink-0"
            title="收起边栏"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Action Buttons */}
      <div className="px-3 space-y-2 mt-1">
        <Link
          href="/ai-workspace" 
          className="flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>工作台</span>
        </Link>
        <Link 
          href="/ai-workspace/conversation/new" 
          className={cn(
            "flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm"
          )}
        >
          <Plus className="w-4 h-4" />
          <span>新对话</span>
        </Link>
      </div>

      {/* Task List Header & Items */}
      <div className="flex-1 overflow-y-auto px-3 mt-4">
        <div className="px-2 pb-2 text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <span className="text-gray-400">≡</span> 任务列表
        </div>
        
        <div className="space-y-1">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <Link 
                key={task.sessionKey}
                href={`/ai-workspace/conversation/${task.sessionKey}`}
                className={cn(
                  "flex items-start gap-2.5 w-full p-2.5 rounded-xl transition-colors text-xs",
                  pathname === `/ai-workspace/conversation/${task.sessionKey}` ? "bg-white shadow-sm text-gray-900 font-semibold border border-gray-100" : "text-gray-600 hover:bg-gray-200/50"
                )}
              >
                <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 truncate">{task.title}</div>
                  <div className="text-[11px] text-gray-400 truncate mt-0.5">{task.preview}</div>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-2 py-6 text-center text-xs leading-5 text-gray-400">
              {isTrialEntry ? '访客模式不保存任务' : '暂无关联任务'}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-gray-200/60 space-y-1">
        <button className="flex items-center justify-between w-full p-2 text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors text-xs">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span>设置</span>
          </div>
        </button>
        <button className="flex items-center justify-between w-full p-2 text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors text-xs">
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4" />
            <span>语言</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 bg-gray-200/60 text-gray-600 rounded-md font-medium">中</span>
        </button>
        <button className="flex items-center justify-between w-full p-2 text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors text-xs">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4" />
            <span>主题</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 bg-gray-200/60 text-gray-600 rounded-md font-medium">跟随</span>
        </button>
      </div>
    </aside>
  );
}
