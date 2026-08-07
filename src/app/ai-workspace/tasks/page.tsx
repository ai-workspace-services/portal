"use client";

import React, { useState } from 'react';
import { Search, Plus, Filter, CheckSquare, Folder, FileText } from 'lucide-react';
import ProjectCard from '@/components/ai-workspace/ProjectCard';
import { cn } from '@/lib/utils';

export default function TasksPage() {
  const [filter, setFilter] = useState('all');

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">任务列表</h1>
          <p className="text-sm text-gray-500">管理与推进您的所有 TaskThread 专项</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索任务或专项..." 
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 outline-none w-64"
            />
          </div>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm">
            <Plus className="w-4 h-4" />
            新建任务
          </button>
        </div>
      </header>

      {/* Filter Toolbar */}
      <div className="flex items-center justify-between px-8 py-3 border-b border-gray-100 bg-gray-50/50">
        <div className="flex gap-2">
          {['all', 'in_progress', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                filter === f ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-900"
              )}
            >
              {f === 'all' && '全部任务'}
              {f === 'in_progress' && '进行中'}
              {f === 'completed' && '已完成'}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
          <Filter className="w-3.5 h-3.5" />
          筛选排序
        </button>
      </div>

      {/* Main Task List */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">专项推进列表</h3>
          <ProjectCard title="draft-1785823210227642..." threadsCount={1} artifactsCount={3} progress={28} />
          <ProjectCard title="draft-178590624986936..." threadsCount={1} artifactsCount={0} progress={12} />
          <ProjectCard title="draft-178574641044258..." threadsCount={1} artifactsCount={8} progress={28} />
          <ProjectCard title="draft-1785762014105762-2" threadsCount={1} artifactsCount={1} progress={28} />
          <ProjectCard title="draft-1785600000000000-1" threadsCount={2} artifactsCount={4} progress={65} />
          <ProjectCard title="draft-1785500000000000-0" threadsCount={1} artifactsCount={12} progress={100} />
        </div>
      </div>
    </div>
  );
}
