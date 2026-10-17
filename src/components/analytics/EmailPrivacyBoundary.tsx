"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
export default function EmailPrivacyBoundary({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  return pathname === "/email" || pathname?.startsWith("/email/")
    ? null
    : children;
}
