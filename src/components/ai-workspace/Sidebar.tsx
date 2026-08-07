"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, LayoutDashboard, Plus, Settings, Languages, Sun, PanelLeftClose, PanelLeftOpen, CheckSquare, Image, FileText, Folder, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside 
      className={cn(
        "bg-[#f7f7f8] flex flex-col h-full transition-all duration-300 ease-in-out border-r border-gray-200",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Top Logo / Toggle */}
      <div className="p-4 flex items-center justify-between h-14">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2">
            <div className="w-6 h-6 bg-gray-900 text-white rounded flex items-center justify-center font-bold text-xs">X</div>
            <span className="font-bold text-gray-900">XWorkmate</span>
          </div>
        )}
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-6 h-6 bg-gray-900 text-white rounded flex items-center justify-center font-bold text-xs">X</div>
          </div>
        )}
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-md transition-colors">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <div className="w-full flex justify-center pb-2">
          <button onClick={() => setCollapsed(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-md transition-colors">
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Actions */}
      <div className="px-3 space-y-2 mt-2">
        <Link 
          href="/ai-workspace/conversation/new" 
          className={cn(
            "flex items-center gap-2 w-full py-2 bg-white border border-gray-200 text-gray-900 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm",
            collapsed ? "justify-center px-0" : "px-3"
          )}
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">新建会话</span>
              <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">⌘ K</span>
            </>
          )}
        </Link>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 mt-6">
        <div className="space-y-1">
          <NavItem 
            href="/ai-workspace" 
            icon={LayoutDashboard} 
            title="工作台" 
            active={pathname === '/ai-workspace'} 
            collapsed={collapsed} 
          />
          <NavItem 
            href="/ai-workspace/tasks" 
            icon={CheckSquare} 
            title="任务列表" 
            active={pathname === '/ai-workspace/tasks'} 
            collapsed={collapsed} 
          />
          
          {!collapsed && <div className="pt-4 pb-2 px-3 text-xs font-semibold text-gray-400">最近对话</div>}
          
          <NavItem 
            href="/ai-workspace/conversation/1" 
            icon={MessageSquare} 
            title="主页SEO优化" 
            active={pathname === '/ai-workspace/conversation/1'} 
            collapsed={collapsed} 
          />
          <NavItem 
            href="/ai-workspace/conversation/2" 
            icon={MessageSquare} 
            title="管线测试复跑" 
            active={false} 
            collapsed={collapsed} 
          />
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-3 space-y-1 mb-2">
        <NavItem href="#" icon={Settings} title="设置" collapsed={collapsed} />
        {!collapsed && (
          <div className="mx-2 mt-4 p-3 bg-gray-100/80 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-gray-200/60 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs">
                U
              </div>
              <span className="text-sm font-medium text-gray-700">登录</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center mt-4">
            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-bold text-xs cursor-pointer">
              U
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

function NavItem({ href, icon: Icon, title, active, collapsed }: { href: string, icon: any, title: string, active?: boolean, collapsed: boolean }) {
  return (
    <Link 
      href={href}
      className={cn(
        "flex items-center gap-3 w-full py-2 rounded-xl transition-colors",
        collapsed ? "justify-center px-0" : "px-3",
        active ? "bg-white shadow-sm text-gray-900 font-medium" : "text-gray-600 hover:bg-gray-200/50"
      )}
      title={collapsed ? title : undefined}
    >
      <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
      {!collapsed && <span className="flex-1 text-sm truncate">{title}</span>}
    </Link>
  );
}
