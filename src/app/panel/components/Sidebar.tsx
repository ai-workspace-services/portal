"use client";

import React from "react";
import { SidebarRoot } from "../../../components/layout/SidebarRoot";
import {
  PanelSidebarContent,
  PanelSidebarContentProps,
} from "./PanelSidebarContent";

export interface SidebarProps extends PanelSidebarContentProps {
  className?: string;
}

export default function Sidebar({
  className = "",
  onNavigate,
  collapsed = false,
}: SidebarProps) {
  return (
    <SidebarRoot
      className={`transition-[width] duration-200 ${collapsed ? "w-16 p-2" : "w-64 p-3"} border-r border-[color:var(--color-surface-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] shadow-[var(--shadow-soft)] backdrop-blur ${className}`}
    >
      <PanelSidebarContent onNavigate={onNavigate} collapsed={collapsed} />
    </SidebarRoot>
  );
}
