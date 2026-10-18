"use client";

import { Crown, Gem, Circle } from "lucide-react";

export type MembershipTier = "free" | "plus" | "pro" | "team";
type PlanIdentity = {
  planId?: string;
  displayName?: string;
  packageName?: string;
};

export function resolveMembershipTier(
  plan?: PlanIdentity | null,
): MembershipTier | null {
  if (!plan) return null;

  const identity =
    `${plan.planId ?? ""} ${plan.displayName} ${plan.packageName}`
      .trim()
      .toLowerCase();

  if (/team|custom|enterprise|专属|团队|定制/.test(identity)) return "team";
  if (/(^|[^a-z])pro([^a-z]|$)/.test(identity)) return "pro";
  if (/(^|[^a-z])plus([^a-z]|$)/.test(identity)) return "plus";
  if (/(^|[^a-z])free([^a-z]|$)/.test(identity)) return "free";
  return null;
}

const tierStyle: Record<
  MembershipTier,
  { icon: typeof Circle; color: string }
> = {
  free: {
    icon: Circle,
    color: "text-slate-300",
  },
  plus: {
    icon: Crown,
    color: "text-slate-400",
  },
  pro: {
    icon: Crown,
    color: "text-amber-500",
  },
  team: {
    icon: Gem,
    color: "text-slate-500",
  },
};

/** A quiet visual signature, not a new control or a change to plan behavior. */
export default function MembershipTierMark({
  plan,
  size = "default",
}: {
  plan?: PlanIdentity | null;
  size?: "default" | "avatar";
}) {
  const tier = resolveMembershipTier(plan);
  if (!tier) return null;

  const { icon: Icon, color } = tierStyle[tier];
  if (size === "avatar") {
    return (
      <span
        data-membership-tier={tier}
        className={`absolute -right-0.5 -bottom-0.5 grid h-3 w-3 place-items-center rounded-full border border-white bg-white ${color}`}
        aria-hidden="true"
      >
        <Icon className="h-2 w-2" strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span
      data-membership-tier={tier}
      className={`inline-grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-slate-50 ${color}`}
      aria-hidden="true"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
    </span>
  );
}
