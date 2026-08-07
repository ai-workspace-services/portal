"use client";

import React, { useState, useEffect } from 'react';
import { PenSquare, ChevronRight, FileText, RefreshCw, Folder, CheckSquare, Inbox, Layers, PanelRightClose, PanelRightOpen, ChevronsLeft, ChevronsRight } from 'lucide-react';
import DashboardCharts from '@/components/ai-workspace/DashboardCharts';
import ProjectCard from '@/components/ai-workspace/ProjectCard';
import { buildWorkbenchProjection, type TaskThread, type WorkbenchProjection } from '@/lib/xworkmate/workbenchProjection';
import { taskStore } from '@/lib/xworkmate/taskStore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AiWorkspacePage() {
  const [activeTab, setActiveTab] = useState('总览');
  const [threads, setThreads] = useState<TaskThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [rightRailCollapsed, setRightRailCollapsed] = useState(false);

  useEffect(() => {
    // Map taskStore items to TaskThread
    const syncLocalTasks = () => {
      const storeItems = taskStore.getTasks();
      const mappedThreads: TaskThread[] = storeItems.map(item => ({
        id: item.id,
        sessionKey: item.sessionKey,
        title: item.title,
        workspacePath: item.projectLabel,
        artifactPaths: item.artifactPaths,
        messages: [{ role: 'user', text: item.preview }],
        updatedAtMs: item.updatedAtMs,
        lifecycleStatus: item.status,
      }));
      setThreads(mappedThreads);
    };

    syncLocalTasks();
    const unsubscribe = taskStore.subscribe(syncLocalTasks);

    async function fetchDashboard() {
      try {
        setLoading(true);
        const res = await fetch('/api/ai-workspace/threads');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setThreads(data);
          }
        }
      } catch (err) {
        console.warn('Using local workbench thread projection', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();

    return unsubscribe;
  }, []);

  const projection: WorkbenchProjection = buildWorkbenchProjection(threads);

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">工作台</h1>
          <p className="text-sm text-gray-500">把零碎进展沉淀为清晰工作</p>
        </div>
        <div className="flex items-center gap-3">
          {loading && <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />}
          {rightRailCollapsed && (
            <button
              onClick={() => setRightRailCollapsed(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              title="展开工作洞察面板"
            >
              <ChevronsLeft className="w-4 h-4" />
              工作洞察
            </button>
          )}
          <Link 
            href="/ai-workspace/conversation/new"
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm text-sm"
          >
            <PenSquare className="w-4 h-4" />
            快速记录
          </Link>
        </div>
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
                    activeTab === tab ? "text-blue-600 font-semibold" : "text-gray-500 hover:text-gray-900"
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
            {/* Tab: 总览 */}
            {activeTab === '总览' && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-gray-900 mb-4">正在推进的专项</h3>
                <div className="space-y-1">
                  {projection.projects.length > 0 ? (
                    projection.projects.map((proj, idx) => (
                      <ProjectCard 
                        key={idx} 
                        title={proj.label} 
                        threadsCount={proj.items.length} 
                        artifactsCount={proj.artifactCount} 
                        progress={proj.progress} 
                      />
                    ))
                  ) : (
                    <EmptyState icon={Layers} title="当前暂无推进中的专项" subtitle="发起对话任务后，新的专项会自动出现在这里" />
                  )}
                </div>
                {projection.projects.length > 0 && (
                  <Link href="/ai-workspace/tasks" className="w-full mt-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-center gap-1">
                    查看全部专项 <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            )}

            {/* Tab: 我的待办 */}
            {activeTab === '我的待办' && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">我的待办 TaskThread</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{projection.items.length} 项待处理</span>
                </div>
                {projection.items.length > 0 ? (
                  <div className="space-y-3">
                    {projection.items.map((item, idx) => (
                      <div key={idx} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                          <div>
                            <div className="text-sm font-bold text-gray-900">{item.title}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{item.preview}</div>
                          </div>
                        </div>
                        <Link href={`/ai-workspace/conversation/${item.sessionKey}`} className="text-xs font-medium text-blue-600 hover:underline">
                          去处理 →
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={CheckSquare} title="当前没有待处理事项" subtitle="按运行状态和最近进展汇总 TaskThread" />
                )}
              </div>
            )}

            {/* Tab: 项目 / 专项 */}
            {activeTab === '项目 / 专项' && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">全部专项聚合</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{projection.projects.length} 个专项</span>
                </div>
                {projection.projects.length > 0 ? (
                  <div className="space-y-1">
                    {projection.projects.map((proj, idx) => (
                      <ProjectCard 
                        key={idx} 
                        title={proj.label} 
                        threadsCount={proj.items.length} 
                        artifactsCount={proj.artifactCount} 
                        progress={proj.progress} 
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Folder} title="暂无项目专项" subtitle="按真实工作目录聚合 TaskThread 与 Artifact" />
                )}
              </div>
            )}

            {/* Tab: 收件箱 */}
            {activeTab === '收件箱' && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900">工作收件箱</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{projection.inbox.length} 条记录</span>
                </div>
                {projection.inbox.length > 0 ? (
                  <div className="space-y-3">
                    {projection.inbox.map((inboxItem, idx) => (
                      <div key={idx} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{inboxItem.title}</div>
                            <div className="text-xs text-gray-400">{inboxItem.subtitle}</div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">{inboxItem.sourceTitle}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Inbox} title="收件箱暂无新产物" subtitle="集中查看 Artifact、输入附件和待整理工作记录" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Insights - Collapsible) */}
        <div 
          className={cn(
            "flex-shrink-0 bg-gray-50/50 border-l border-gray-100 transition-all duration-300 ease-in-out flex flex-col",
            rightRailCollapsed ? "w-12 items-center py-4" : "w-80 p-6 overflow-y-auto gap-6"
          )}
        >
          {rightRailCollapsed ? (
            <button 
              onClick={() => setRightRailCollapsed(false)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors"
              title="展开工作洞察"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900">工作洞察</h3>
                <button 
                  onClick={() => setRightRailCollapsed(true)} 
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-md transition-colors"
                  title="收起洞察面板"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>

              <DashboardCharts data={projection.workloadSeries} />

              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">本周节奏</h3>
                  <span className="text-xs text-gray-500">实时计算</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">计划工作项</span>
                      <span className="font-bold text-gray-900">{projection.totalPlannedCount}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: `${projection.totalPlannedCount > 0 ? 100 : 0}%` }} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">已有进展</span>
                      <span className="font-bold text-gray-900">{projection.completedCount}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${projection.overallProgress}%` }} />
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-gray-600">整体进度</span>
                    <span className="text-base font-bold text-blue-600">{projection.overallProgress}%</span>
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
                  {projection.items.length > 0 ? (
                    <div className="bg-gray-50 rounded-xl p-3 flex gap-3 items-center">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-600 mb-0.5">建议整理最近任务</p>
                        <p className="text-sm font-medium text-gray-900 truncate">{projection.items[0].title}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-4">暂无待整理建议</p>
                  )}
                </div>
                
                <p className="text-[10px] text-gray-400 mt-4 text-center">基于当前 TaskThread 与 Artifact 智能建议</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-gray-400 border border-dashed border-gray-200 rounded-2xl">
      <Icon className="w-10 h-10 mb-2 text-gray-300" strokeWidth={1.5} />
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
    </div>
  );
}
