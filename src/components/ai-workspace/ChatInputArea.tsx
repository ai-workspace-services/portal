"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ArrowUp, FileText, Table, Presentation, Image as ImageIcon, Video, ShoppingBag, ScrollText, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskStore } from '@/lib/xworkmate/taskStore';
import * as Popover from '@radix-ui/react-popover';

const TOOLS = [
  { category: '通用', items: [
    { name: '文档', desc: '将任意对话内容整理为可编辑文档，同步导出 Markdown...', icon: FileText, color: 'bg-blue-500', textColor: 'text-white' },
    { name: '电子表格', desc: '将任意对话内容结构化为可编辑表格，导出 CSV 与...', icon: Table, color: 'bg-emerald-500', textColor: 'text-white' },
    { name: 'PPT 演示', desc: '将对话内容生成可编辑 PPT：图像还原为可编辑元素...', icon: Presentation, color: 'bg-orange-500', textColor: 'text-white' },
    { name: '图片', desc: '将对话内容输出为图片（JPEG/PNG），支持批量制作...', icon: ImageIcon, color: 'bg-purple-500', textColor: 'text-white' },
    { name: '视频', desc: '将对话内容编排为分镜脚本...', icon: Video, color: 'bg-red-500', textColor: 'text-white' },
  ]},
  { category: '电商', items: [
    { name: '电商头图', desc: '按模特、场景、光影分别指定参考图...', icon: ShoppingBag, color: 'bg-indigo-500', textColor: 'text-white' },
    { name: '商品详情页', desc: '模块化生成详情页长图...', icon: ScrollText, color: 'bg-violet-500', textColor: 'text-white' },
    { name: '爆款视频复刻', desc: '拆解 TikTok / 抖音爆款脚本...', icon: Smartphone, color: 'bg-red-500', textColor: 'text-white' },
  ]}
];

export default function ChatInputArea() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('快速');
  const router = useRouter();

  const handleSubmit = () => {
    if (!text.trim()) return;
    const newTask = taskStore.addTask(text, text);
    setText('');
    router.push(`/ai-workspace/conversation/${newTask.sessionKey}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-[28px] shadow-sm p-4 mx-auto w-full relative flex flex-col transition-all hover:border-gray-300">
      {/* Text Area */}
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="尽管问，或做个 Agent 任务..."
        className="w-full min-h-[90px] resize-none outline-none border-none text-base text-gray-900 placeholder:text-gray-400 p-2 bg-transparent leading-relaxed"
      />

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2">
        {/* Left Plus Popover */}
        <Popover.Root>
          <Popover.Trigger asChild>
            <button className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors">
              <Plus className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content 
              className="w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
              sideOffset={8}
              align="start"
            >
              <div className="max-h-[400px] overflow-y-auto pr-1 py-1 space-y-4">
                {TOOLS.map((group, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-semibold text-gray-400 mb-2 px-3">{group.category}</div>
                    <div className="space-y-1">
                      {group.items.map((tool, i) => (
                        <button key={i} className="flex items-center gap-3 w-full p-2.5 hover:bg-gray-50 rounded-xl text-left transition-colors">
                          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", tool.color, tool.textColor)}>
                            <tool.icon className="w-4.5 h-4.5" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                              {tool.name}
                              <span className="text-xs font-normal text-gray-400 truncate">{tool.desc}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        {/* Right Mode Dropdown & Submit Circle */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-full hover:bg-gray-100 transition-colors font-medium">
            <span>{mode} 进阶</span>
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </button>

          <button 
            onClick={handleSubmit}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm",
              text.trim() ? "bg-gray-900 text-white hover:bg-black" : "bg-gray-200 text-white cursor-not-allowed"
            )}
          >
            <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
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
