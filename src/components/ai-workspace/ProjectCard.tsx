import React from 'react';
import { Folder, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProjectCardProps {
  title: string;
  threadsCount: number;
  artifactsCount: number;
  progress: number;
}

const STEPS = ['需求确认', '方案设计', '开发中', '测试', '上线'];

export default function ProjectCard({ title, threadsCount, artifactsCount, progress }: ProjectCardProps) {
  // progress is 0-100
  // we want to place a blue dot on the line according to progress
  
  return (
    <div className="flex items-center gap-4 py-4 px-2 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
        <Folder className="w-5 h-5 fill-current" />
      </div>
      
      <div className="flex-1 min-w-0 pr-8 relative">
        <div className="flex justify-between items-baseline mb-1">
          <h4 className="text-sm font-semibold text-gray-900 truncate pr-4">{title}</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          {threadsCount} 个 TaskThread · {artifactsCount} 个 Artifact
        </p>
        
        {/* Progress Bar Area */}
        <div className="relative">
          <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-gray-200 rounded-full" />
          <div 
            className="absolute top-1.5 left-0 h-0.5 bg-blue-600 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }} 
          />
          <div 
            className="absolute top-0.5 w-3 h-3 bg-blue-600 rounded-full shadow border-2 border-white transition-all duration-500" 
            style={{ left: `calc(${progress}% - 6px)` }} 
          />
          
          <div className="flex justify-between mt-3 px-1">
            {STEPS.map((step, i) => (
              <span key={step} className="text-[10px] text-gray-400 font-medium">
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col items-end flex-shrink-0 gap-2">
        <span className="text-base font-bold text-blue-600">{progress}%</span>
        <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}
