"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/ai-workspace/Sidebar';
import { ChevronsRight } from 'lucide-react';

export default function AiWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarHidden, setSidebarHidden] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm text-gray-900 font-sans relative">
      {/* Left Sidebar */}
      {!sidebarHidden && (
        <Sidebar onHide={() => setSidebarHidden(true)} />
      )}

      {/* Reveal rail button when sidebar is hidden */}
      {sidebarHidden && (
        <button
          onClick={() => setSidebarHidden(false)}
          className="absolute left-3 top-3 z-50 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
          title="展开边栏 (Expand sidebar)"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden h-full flex py-2 pr-2 pl-2">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
