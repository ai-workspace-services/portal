"use client";

import { cn } from "@/lib/utils";

import {
  PanelSidebarContent,
  type PanelSidebarContentProps,
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
    <aside
      className={cn(
        "xds xds-sidebar flex h-full flex-col",
        collapsed && "xds-is-collapsed",
        className,
      )}
    >
      <PanelSidebarContent onNavigate={onNavigate} collapsed={collapsed} />
    </aside>
  );
}
