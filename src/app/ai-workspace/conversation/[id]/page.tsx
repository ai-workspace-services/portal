"use client";

import React, { useState } from 'react';
import ChatInputArea from '@/components/ai-workspace/ChatInputArea';
import RightContextPanel from '@/components/ai-workspace/RightContextPanel';
import { Network, Presentation, Microscope, Globe, FileText, Table, Palette, ChevronsLeft } from 'lucide-react';

export default function ConversationPage() {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  return (
    <div className="flex-1 flex overflow-hidden bg-white relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        {/* Top Right Actions */}
        <div className="absolute top-4 right-4 flex items-center gap-3 text-xs z-10">
          <span className="text-gray-400">已连接 · xworkmate-bridge.svc.plus</span>
          {!rightPanelOpen && (
            <button
              onClick={() => setRightPanelOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-gray-600 transition-colors font-medium"
              title="展开右侧上下文面板"
            >
              <ChevronsLeft className="w-4 h-4" />
              上下文
            </button>
          )}
        </div>

        {/* Center Content for Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <h1 className="text-5xl font-black tracking-widest text-gray-900 mb-12">
            XWORKMATE
          </h1>
          
          <div className="w-full max-w-3xl">
            <ChatInputArea />
          </div>

          {/* Quick Suggestions below input */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-2 max-w-3xl">
            <SuggestionItem icon={Network} label="集群" />
            <SuggestionItem icon={Presentation} label="PPT" />
            <SuggestionItem icon={Microscope} label="深度研究" />
            <SuggestionItem icon={Globe} label="网站" />
            <SuggestionItem icon={FileText} label="文档" />
            <SuggestionItem icon={Table} label="表格" />
            <SuggestionItem icon={Palette} label="设计" />
          </div>
        </div>

        {/* Bottom Floating Inspiration */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50/80 backdrop-blur-md rounded-2xl text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500">💡</span>
              探索灵感
            </div>
            <div className="flex items-center gap-1 cursor-pointer hover:text-gray-700">
              滑动探索 
              <ChevronUpIcon className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      {rightPanelOpen && (
        <RightContextPanel onClose={() => setRightPanelOpen(false)} />
      )}
    </div>
  );
}

function SuggestionItem({ icon: Icon, label }: { icon: any, label: string }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-full text-[13px] text-gray-600 font-medium transition-colors shadow-sm">
      <Icon className="w-4 h-4 text-gray-400" />
      {label}
    </button>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m18 15-6-6-6 6"/>
    </svg>
  );
}
