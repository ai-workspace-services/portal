"use client";
import { useEffect } from "react";
import { create } from "zustand";
import {
  type ReferralCampaign,
  isReferralCampaign,
} from "@/lib/referral-campaign";

type CampaignState = {
  campaign: ReferralCampaign | null;
  loading: boolean;
  refresh: () => Promise<void>;
};
const useCampaignState = create<CampaignState>((set, get) => ({
  campaign: null,
  loading: false,
  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const response = await fetch("/api/referrals/campaign", {
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      const campaign = (payload as { campaign?: unknown })?.campaign;
      if (!response.ok || !isReferralCampaign(campaign))
        throw new Error("campaign_unavailable");
      set({ campaign });
    } catch {
      set({ campaign: null });
    } finally {
      set({ loading: false });
    }
  },
}));
export function useReferralCampaign(): ReferralCampaign | null {
  const campaign = useCampaignState((s) => s.campaign);
  const refresh = useCampaignState((s) => s.refresh);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  return campaign;
}
