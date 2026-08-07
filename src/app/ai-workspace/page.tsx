"use client";

import React, { useState } from 'react';
import { PenSquare, ChevronRight, FileText, CheckCircle2 } from 'lucide-react';
import DashboardCharts from '@/components/ai-workspace/DashboardCharts';
import ProjectCard from '@/components/ai-workspace/ProjectCard';
import { cn } from '@/lib/utils';

export default function AiWorkspacePage() {
  const [activeTab, setActiveTab] = useState('总览');

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">工作台</h1>
          <p className="text-sm text-gray-500">把零碎进展沉淀为清晰工作</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <PenSquare className="w-4 h-4" />
          快速记录
        </button>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left Column (Tabs & Projects) */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-100">
          <div className="px-8 pt-4">
            <div className="flex gap-6 border-b border-gray-200">
              {['总览', '我的待办', '项目 / 专项', '收件箱'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "pb-3 text-sm font-medium transition-colors relative",
                    activeTab === tab ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                  )}
                >
                  {tab}
                  {activeTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-900 mb-4">正在推进的专项</h3>
              <div className="space-y-1">
                <ProjectCard title="draft-1785823210227642..." threadsCount={1} artifactsCount={3} progress={28} />
                <ProjectCard title="draft-178590624986936..." threadsCount={1} artifactsCount={0} progress={12} />
                <ProjectCard title="draft-178574641044258..." threadsCount={1} artifactsCount={8} progress={28} />
                <ProjectCard title="draft-1785762014105762-2" threadsCount={1} artifactsCount={1} progress={28} />
              </div>
              <button className="w-full mt-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-center gap-1">
                查看全部专项 <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (Insights) */}
        <div className="w-80 flex-shrink-0 bg-gray-50/50 p-6 overflow-y-auto border-l border-gray-100 flex flex-col gap-6">
          <DashboardCharts />

          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-gray-900">本周节奏</h3>
              <span className="text-xs text-gray-500">8/3 - 8/9</span>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">计划工作项</span>
                  <span className="font-bold text-gray-900">23</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 w-full" />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">已有进展</span>
                  <span className="font-bold text-gray-900">2</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[10%]" />
                </div>
              </div>
              
              <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-sm text-gray-600">整体进度</span>
                <span className="text-base font-bold text-blue-600">26%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 text-orange-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="12" r="5" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">AI 整理建议</h3>
            </div>
            
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 flex gap-3 items-center">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 mb-0.5">建议整理最近收件</p>
                  <p className="text-sm font-medium text-gray-900 truncate">自媒体矩阵文案.v2.md</p>
                </div>
                <button className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded bg-white border border-gray-200 shadow-sm">
                  确认
                </button>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 flex gap-3 items-center">
                <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 mb-0.5">建议补充下一步任务</p>
                  <p className="text-sm font-medium text-gray-900 truncate">draft-1785823210227642-3</p>
                </div>
                <button className="text-xs font-medium text-gray-600 hover:text-gray-900 px-2 py-1 rounded bg-white border border-gray-200 shadow-sm">
                  创建
                </button>
              </div>
            </div>
            
            <p className="text-[10px] text-gray-400 mt-4 text-center">基于当前 TaskThread 与 Artifact 智能建议</p>
          </div>
        </div>
      </div>
    </div>
  );
}
