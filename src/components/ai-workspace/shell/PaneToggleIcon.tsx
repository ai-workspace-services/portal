import { cn } from "@/lib/utils";

/**
 * The panel glyph every side-pane toggle uses, same as the XWorkmate App: a
 * rounded frame with a divider on the pane's side, mirrored for the right
 * pane, instead of chevrons that point whichever way the pane moves.
 */
export function PaneToggleIcon({
  side,
  className,
}: {
  side: "left" | "right";
  className?: string;
}) {
  const x = side === "left" ? 9.5 : 14.5;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className={cn("size-[18px]", className)}
    >
      <rect x={3} y={4} width={18} height={16} rx={3} />
      <line x1={x} y1={4} x2={x} y2={20} />
    </svg>
  );
}
