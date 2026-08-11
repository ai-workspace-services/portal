"use client";

import React, { useState } from 'react';
import { Copy, RefreshCw, ChevronsRight, MessageSquare, Folder, FileText, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ArtifactFile {
  name: string;
  path: string;
  size: string;
  date: string;
}

interface RightContextPanelProps {
  sessionTitle?: string;
  workingPath?: string;
  msgCount?: number;
  files?: ArtifactFile[];
  onClose?: () => void;
}

export default function RightContextPanel({
  sessionTitle = "对话任务",
  workingPath = ".../threads/draft-active",
  msgCount = 0,
  files = [],
  onClose,
}: RightContextPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'preview'>('all');

  return (
    <aside className="w-80 bg-white border-l border-gray-100 flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-in-out">
      {/* Top Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-900 text-sm truncate pr-2">{sessionTitle}</h2>
          <div className="flex gap-1 text-gray-400">
            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="刷新">
              <RefreshCw className="w-4 h-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors" title="收起边栏">
                <ChevronsRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Path Bar */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1.5">当前任务工作路径</div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
            <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate flex-1 font-mono">{workingPath}</span>
            <button className="text-gray-400 hover:text-gray-600"><Copy className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Message Context Summary */}
        <button className="w-full flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm text-sm hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2 text-gray-700 font-medium">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            任务上下文会话
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">{msgCount} msg · synced</span>
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </div>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-2 border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('all')}
          className={cn("px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors", activeTab === 'all' ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700")}
        >
          全部文件
        </button>
        <button 
          onClick={() => setActiveTab('preview')}
          className={cn("px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors", activeTab === 'preview' ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700")}
        >
          预览
        </button>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {files.length > 0 ? (
          files.map((file, idx) => (
            <div key={idx} className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 transition-colors group cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-900 truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <Eye className="w-3.5 h-3.5 hover:text-gray-700" />
                  <Folder className="w-3.5 h-3.5 hover:text-gray-700" />
                </div>
              </div>
              <div className="text-[11px] text-gray-400 truncate mb-1">{file.path}</div>
              <div className="text-[10px] text-gray-400 font-mono">
                text/markdown · {file.size} · {file.date}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
            <Folder className="w-12 h-12 mb-3 text-gray-200" strokeWidth={1} />
            <p className="text-sm font-medium text-gray-500 mb-1">暂无文件</p>
            <p className="text-xs text-center text-gray-400">No task artifacts recorded for this run.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
