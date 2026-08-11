"use client";

import React, { useState, useEffect } from 'react';
import ChatInputArea from '@/components/ai-workspace/ChatInputArea';
import RightContextPanel, { type ArtifactFile } from '@/components/ai-workspace/RightContextPanel';
import { Network, Presentation, Microscope, Globe, FileText, Table, Palette, ChevronsLeft, PlayCircle, Menu } from 'lucide-react';
import { useParams } from 'next/navigation';
import { taskStore, type TaskItem } from '@/lib/xworkmate/taskStore';

export default function ConversationPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const isNew = id === 'new' || !id;

  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  useEffect(() => {
    if (!isNew && id) {
      const found = taskStore.getTasks().find(t => t.sessionKey === id || t.id === id);
      if (found) {
        setActiveTask(found);
      } else {
        setActiveTask({
          id: id,
          sessionKey: id,
          title: '对话任务',
          preview: '正在运行中...',
          projectLabel: '通用专项',
          updatedAtMs: Date.now(),
          status: 'running',
          progress: 25,
          artifactPaths: [],
        });
      }
    }
  }, [id, isNew]);

  const taskTitle = isNew ? '新对话' : (activeTask?.title || '对话任务');
  const workingPath = isNew ? '.../threads/draft-new' : `.../threads/${id}`;
  const messages = isNew ? [] : [
    { role: 'user', content: activeTask?.preview || '任务开始执行' },
    { role: 'assistant', content: 'XWorkmate 已接收到您的需求，正在沿用当前任务上下文为您持续处理。' }
  ];

  return (
    <div className="flex-1 flex overflow-hidden bg-white relative">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white relative">
        
        {/* Top Status & Controls Bar */}
        {isNew ? (
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
        ) : (
          <header className="flex justify-center items-center py-3 px-6 relative flex-shrink-0 border-b border-gray-50 bg-white z-10">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-1.5 py-1 shadow-sm text-xs">
              <button className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white font-medium shadow-sm">
                <PlayCircle className="w-3.5 h-3.5" />
                对话工作流
              </button>
              <div className="h-3.5 w-px bg-gray-300" />
              <button className="flex items-center gap-1 px-2.5 py-1 rounded-full text-gray-600 hover:bg-gray-200/50">
                <Menu className="w-3.5 h-3.5" />
                渲染
                <ChevronDownIcon className="w-3 h-3 text-gray-400" />
              </button>
              <div className="h-3.5 w-px bg-gray-300" />
              <span className="px-2 py-0.5 text-gray-500">已连接 · xworkmate-bridge.svc.plus</span>
            </div>
            {!rightPanelOpen && (
              <button
                onClick={() => setRightPanelOpen(true)}
                className="absolute right-4 flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 text-xs text-gray-600 transition-colors font-medium"
                title="展开右侧上下文面板"
              >
                <ChevronsLeft className="w-4 h-4" />
                上下文
              </button>
            )}
          </header>
        )}

        {/* Conversation Stream Content */}
        {isNew ? (
          /* Empty New Conversation State */
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-8 pt-16 pb-4">
            <h1 className="text-5xl font-black tracking-widest text-gray-900 mb-8">
              XWORKMATE
            </h1>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-3xl">
              <SuggestionItem icon={Network} label="集群" />
              <SuggestionItem icon={Presentation} label="PPT" />
              <SuggestionItem icon={Microscope} label="深度研究" />
              <SuggestionItem icon={Globe} label="网站" />
              <SuggestionItem icon={FileText} label="文档" />
              <SuggestionItem icon={Table} label="表格" />
              <SuggestionItem icon={Palette} label="设计" />
            </div>
          </div>
        ) : (
          /* Active Thread Message Context Replay */
          <div className="flex-1 overflow-y-auto p-8 max-w-3xl w-full mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl max-w-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'bg-gray-50 text-gray-900 border border-gray-100 shadow-sm whitespace-pre-line'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Docked Chat Input Container */}
        <div className="w-full max-w-3xl mx-auto px-4 pb-6 flex-shrink-0">
          <ChatInputArea />
        </div>
      </div>

      {/* Right Sidebar */}
      {rightPanelOpen && (
        <RightContextPanel 
          sessionTitle={taskTitle}
          workingPath={workingPath}
          msgCount={isNew ? 0 : messages.length}
          files={activeTask?.artifactPaths.map(p => ({ name: p, path: p, size: '1.2 KB', date: '刚刚' })) || []}
          onClose={() => setRightPanelOpen(false)} 
        />
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

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
