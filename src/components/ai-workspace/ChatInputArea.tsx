"use client";

import React, { useState } from 'react';
import { Plus, Puzzle, Zap, Key, ShieldCheck, ArrowUp, FileText, Table, Presentation, Image as ImageIcon, Video, ShoppingBag, ScrollText, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as Popover from '@radix-ui/react-popover';

const TOOLS = [
  { category: '通用', items: [
    { name: '文档', desc: '将任意对话内容整理为可编辑文档', icon: FileText, color: 'bg-blue-500', textColor: 'text-white' },
    { name: '电子表格', desc: '将任意对话内容结构化为可编辑表格', icon: Table, color: 'bg-emerald-500', textColor: 'text-white' },
    { name: 'PPT 演示', desc: '将对话内容生成可编辑 PPT', icon: Presentation, color: 'bg-orange-500', textColor: 'text-white' },
    { name: '图片', desc: '将对话内容输出为图片 (JPEG/PNG)', icon: ImageIcon, color: 'bg-purple-500', textColor: 'text-white' },
    { name: '视频', desc: '将对话内容编排为分镜脚本', icon: Video, color: 'bg-red-500', textColor: 'text-white' },
  ]},
  { category: '电商', items: [
    { name: '电商头图', desc: '按模特、场景、光影分别指定参考图', icon: ShoppingBag, color: 'bg-indigo-500', textColor: 'text-white' },
    { name: '商品详情页', desc: '模块化生成详情页长图', icon: ScrollText, color: 'bg-violet-500', textColor: 'text-white' },
    { name: '爆款视频复刻', desc: '拆解 TikTok / 抖音爆款的脚本与高光节点', icon: Smartphone, color: 'bg-red-600', textColor: 'text-white' },
  ]}
];

export default function ChatInputArea() {
  const [text, setText] = useState('');

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 mb-4 mx-4">
      {/* Top Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content 
              className="w-80 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
              sideOffset={5}
              align="start"
            >
              <div className="max-h-[400px] overflow-y-auto pr-1 space-y-4">
                {TOOLS.map((group, idx) => (
                  <div key={idx}>
                    <div className="text-xs font-semibold text-gray-400 mb-2 px-2">{group.category}</div>
                    <div className="space-y-1">
                      {group.items.map((tool, i) => (
                        <button key={i} className="flex items-center gap-3 w-full p-2 hover:bg-gray-50 rounded-lg text-left transition-colors">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", tool.color, tool.textColor)}>
                            <tool.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                            <div className="text-xs text-gray-400 truncate">{tool.desc}</div>
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

        <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
          <Puzzle className="w-4 h-4" />
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors">
          <span className="w-3.5 h-3.5 flex items-center justify-center rounded-sm bg-gray-400 text-white text-[10px]">G</span>
          Gateway
          <ChevronDownIcon className="w-3 h-3 text-gray-400" />
        </button>

        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-md text-sm font-medium transition-colors">
          <span className="w-3.5 h-3.5 flex items-center justify-center rounded-sm bg-orange-500 text-white text-[10px]">O</span>
          OpenClaw
          <ChevronDownIcon className="w-3 h-3 text-orange-400" />
        </button>

        <button className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 transition-colors">
          <Zap className="w-4 h-4" />
        </button>
      </div>

      {/* Input Area */}
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="输入需求、补充上下文，XWorkmate 会沿用当前任务上下文持续处理。"
        className="w-full min-h-[80px] resize-none outline-none border-none text-sm text-gray-900 placeholder:text-gray-400 p-1 bg-transparent"
      />

      {/* Bottom Actions */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50">
            <Key className="w-3.5 h-3.5" />
            <ChevronDownIcon className="w-3 h-3" />
          </button>
          <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50">
            <ShieldCheck className="w-3.5 h-3.5" />
            <ChevronDownIcon className="w-3 h-3" />
          </button>
          <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50">
            <span className="w-3.5 h-3.5 rounded-full border border-gray-400 flex items-center justify-center text-[8px]">?</span>
            <ChevronDownIcon className="w-3 h-3" />
          </button>
        </div>

        <button 
          className={cn(
            "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm",
            text.trim() ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          <ArrowUp className="w-4 h-4" />
          提交
        </button>
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
