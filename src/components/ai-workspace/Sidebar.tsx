import Link from 'next/link';
import { Search, LayoutDashboard, Plus, Settings, Languages, Sun, ChevronsLeft, CheckSquare, Image, FileText, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full rounded-r-2xl m-2 mr-0 shadow-sm overflow-hidden">
      {/* Search Header */}
      <div className="p-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索任务" 
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ChevronsLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Main Actions */}
      <div className="px-4 space-y-2">
        <Link 
          href="/ai-workspace" 
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <LayoutDashboard className="w-4 h-4" />
          工作台
        </Link>
        <Link 
          href="/ai-workspace/conversation/new" 
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新对话
        </Link>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto px-4 mt-6">
        <h3 className="text-xs font-semibold text-gray-900 mb-3">任务列表</h3>
        <div className="space-y-1">
          {[
            { title: '新对话', desc: '**管线测试复跑完成**...', time: '8 分钟前', icon: CheckSquare, iconColor: 'text-green-500' },
            { title: '新对话', desc: '写好了，围绕「1000万以...', time: '8 分钟前', icon: Folder, iconColor: 'text-gray-400' },
            { title: '主页SEO优化', desc: '已完成。基于最终品牌树...', time: '8 分钟前', active: true, icon: FileText, iconColor: 'text-blue-500' },
            { title: '新对话', desc: '已完成。这篇三地公司成...', time: '8 分钟前', icon: Folder, iconColor: 'text-gray-400' },
            { title: '新对话', desc: '已完成整理，矩阵文案包...', time: '8 分钟前', icon: Folder, iconColor: 'text-gray-400' },
          ].map((item, i) => (
            <div 
              key={i} 
              className={cn(
                "group p-3 rounded-xl cursor-pointer transition-colors border",
                item.active ? "bg-white border-gray-200 shadow-sm" : "border-transparent hover:bg-gray-50"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <span className="text-gray-500 text-xs">≡</span>
                  </div>
                  {item.title}
                </div>
                <span className="text-xs text-gray-400">{item.time}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 pl-6">
                {item.icon && <item.icon className={cn("w-3 h-3 flex-shrink-0", item.iconColor)} />}
                <span className="truncate">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-gray-100 space-y-1">
        <button className="flex items-center gap-3 w-full p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          <span className="flex-1 text-left">设置</span>
        </button>
        <button className="flex items-center gap-3 w-full p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <Languages className="w-4 h-4" />
          <span className="flex-1 text-left">语言</span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-md">中</span>
        </button>
        <button className="flex items-center gap-3 w-full p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <Sun className="w-4 h-4" />
          <span className="flex-1 text-left">主题</span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-md">跟随</span>
        </button>
      </div>
    </aside>
  );
}
