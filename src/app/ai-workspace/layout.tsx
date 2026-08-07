import React from 'react';
import Sidebar from '@/components/ai-workspace/Sidebar';

export const dynamic = "force-dynamic";

export default function AiWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden text-sm text-gray-900 font-sans">
      <Sidebar />
      <main className="flex-1 overflow-hidden h-full flex py-2 pr-2">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
