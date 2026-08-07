"use client";

import React, { useState } from 'react';
import { Plus, Puzzle, Zap, Key, ShieldCheck, ArrowUp, FileText, Table, Presentation, Image as ImageIcon, Video, ShoppingBag, ScrollText, Smartphone, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as Popover from '@radix-ui/react-popover';

const TOOLS = [
  { category: '通用', items: [
    { name: '文档', desc: '将任意对话内容整理为可编辑文档，同步导出 Markdown...', icon: FileText, color: 'bg-blue-500', textColor: 'text-white' },
    { name: '电子表格', desc: '将任意对话内容结构化为可编辑表格，导出 CSV 与...', icon: Table, color: 'bg-emerald-500', textColor: 'text-white' },
    { name: 'PPT 演示', desc: '将对话内容生成可编辑 PPT：图像还原为可编辑元素...', icon: Presentation, color: 'bg-orange-500', textColor: 'text-white' },
    { name: '图片', desc: '将对话内容输出为图片（JPEG/PNG），支持批量制作、...', icon: ImageIcon, color: 'bg-purple-500', textColor: 'text-white' },
    { name: '视频', desc: '将对话内容编排为分镜脚本，经 hyperframe 或 it-infra-...', icon: Video, color: 'bg-red-500', textColor: 'text-white' },
  ]},
  { category: '电商', items: [
    { name: '电商头图', desc: '按模特、场景、光影、印花、配色分别指定参考图，...', icon: ShoppingBag, color: 'bg-indigo-500', textColor: 'text-white' },
    { name: '商品详情页', desc: '模块化生成详情页长图：生图只做产品与背景，文...', icon: ScrollText, color: 'bg-violet-500', textColor: 'text-white' },
    { name: '爆款视频复刻', desc: '拆解 TikTok / 抖音爆款的脚本与高光节点，换成...', icon: Smartphone, color: 'bg-red-500', textColor: 'text-white' },
  ]}
];

export default function ChatInputArea() {
  const [text, setText] = useState('');

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-4 mx-6 relative flex flex-col">
      {/* Top Toolbar */}
      <div className="flex items-center gap-2.5 mb-3">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-500 transition-colors shadow-sm">
              <Plus className="w-5 h-5" strokeWidth={2} />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content 
              className="w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
              sideOffset={8}
              align="start"
            >
              <div className="max-h-[500px] overflow-y-auto pr-1 py-1 space-y-6">
                {TOOLS.map((group, idx) => (
                  <div key={idx}>
                    <div className="text-[13px] font-semibold text-gray-400 mb-3 px-3">{group.category}</div>
                    <div className="space-y-1">
                      {group.items.map((tool, i) => (
                        <button key={i} className="flex items-center gap-4 w-full p-2.5 hover:bg-gray-50 rounded-xl text-left transition-colors">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", tool.color, tool.textColor)}>
                            <tool.icon className="w-5 h-5" strokeWidth={2} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-bold text-gray-900 flex items-center gap-3">
                              {tool.name}
                              <span className="text-[13px] font-normal text-gray-400 truncate">{tool.desc}</span>
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

        <button className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-500 transition-colors shadow-sm">
          <Puzzle className="w-4 h-4" strokeWidth={2.5} />
        </button>

        <button className="flex items-center gap-2 px-3.5 h-9 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-full text-sm font-semibold transition-colors shadow-sm">
          <Cloud className="w-4 h-4 text-gray-500" strokeWidth={2.5} />
          Gateway
          <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 ml-1" />
        </button>

        <button className="flex items-center gap-2 px-3.5 h-9 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-full text-sm font-semibold transition-colors shadow-sm">
          <span className="text-base leading-none">🦞</span>
          OpenClaw
          <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400 ml-1" />
        </button>

        <button className="w-9 h-9 flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-500 transition-colors shadow-sm">
          <Zap className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Input Area */}
      <textarea 
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="输入需求、补充上下文，XWorkmate 会沿用当前任务上下文持续处理。"
        className="w-full min-h-[100px] resize-none outline-none border-none text-[15px] text-gray-900 placeholder:text-gray-400 p-1 bg-transparent leading-relaxed"
      />

      {/* Bottom Actions */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2.5">
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 px-2.5 h-8 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors">
            <Key className="w-4 h-4" strokeWidth={2} />
            <ChevronDownIcon className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 px-2.5 h-8 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors">
            <ShieldCheck className="w-4 h-4" strokeWidth={2} />
            <ChevronDownIcon className="w-3.5 h-3.5" />
          </button>
          <button className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 px-2.5 h-8 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors">
            <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-bold">?</span>
            <ChevronDownIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <button 
          className={cn(
            "flex items-center gap-1.5 px-5 h-9 rounded-full text-sm font-semibold transition-colors shadow-sm",
            "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
          提交
        </button>
      </div>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6"/>
    </svg>
  );
}
