"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export interface DashboardChartsProps {
  data?: { name: string; value: number }[];
}

function getZeroWorkloadSeries() {
  const dates = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push({ name: `${d.getMonth() + 1}/${d.getDate()}`, value: 0 });
  }
  return dates;
}

export default function DashboardCharts({ data }: DashboardChartsProps) {
  const chartData = (data && data.length > 0) ? data : getZeroWorkloadSeries();

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">工作负载趋势（近 7 天）</h3>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#9ca3af' }}
              tickCount={5}
              domain={[0, 'dataMax + 5']}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line 
              type="linear" 
              dataKey="value" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={{ r: 3, fill: '#2563eb', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
