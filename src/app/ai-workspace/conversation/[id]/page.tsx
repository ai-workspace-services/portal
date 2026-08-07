"use client";

import React from 'react';
import ChatInputArea from '@/components/ai-workspace/ChatInputArea';
import RightContextPanel from '@/components/ai-workspace/RightContextPanel';
import { PenSquare, PlayCircle, Menu } from 'lucide-react';

export default function ConversationPage() {
  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-50/30">
        {/* Header */}
        <header className="flex justify-center items-center py-4 px-6 relative flex-shrink-0">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-1 py-1 shadow-sm text-sm">
            <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white font-medium">
              <PlayCircle className="w-4 h-4" />
              对话工作流
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <button className="flex items-center gap-1 px-3 py-1 rounded-full text-gray-600 hover:bg-gray-50">
              <Menu className="w-4 h-4" />
              渲染
              <ChevronDownIcon className="w-3 h-3 text-gray-400" />
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <span className="px-3 py-1 text-gray-500 text-xs">已连接 · xworkmate-bridge.svc.plus</span>
          </div>
        </header>

        {/* Chat History Area (Empty State for now) */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 max-w-md w-full text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-2">开始对话或运行任务</h2>
            <p className="text-sm text-gray-500 mb-6">输入需求后即可开始执行，结果会回到当前会话并同步到任务页。</p>
            <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <PenSquare className="w-4 h-4" />
              开始输入
            </button>
          </div>
        </div>

        {/* Bottom Input Area */}
        <div className="flex-shrink-0">
          <ChatInputArea />
        </div>
      </div>

      {/* Right Sidebar */}
      <RightContextPanel />
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
