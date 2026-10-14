"use client";
import { create } from "zustand";

import { normalizeReferralCode } from "@/lib/referral-code";

type ReferralAttribution = {
  referralCode: string | null;
  captureLocation: () => void;
  clear: () => void;
};
const KEY = "xconnect-referral-2026";
/** URL attribution belongs to application state, never to individual forms. */
export const useReferralAttribution = create<ReferralAttribution>(
  (set, get) => ({
    referralCode: null,
    captureLocation: () => {
      if (typeof window === "undefined") return;
      try {
        const url = new URL(window.location.href);
        const saved = normalizeReferralCode(window.sessionStorage.getItem(KEY));
        const candidate = normalizeReferralCode(
          url.searchParams.get("ref") ?? url.searchParams.get("code"),
        );
        const code = get().referralCode ?? saved ?? candidate;
        if (code) {
          set({ referralCode: code });
          window.sessionStorage.setItem(KEY, code);
        }
      } catch {
        /* Browsers with storage disabled still preserve attribution in state. */
        const url = new URL(window.location.href);
        set({
          referralCode:
            get().referralCode ??
            normalizeReferralCode(
              url.searchParams.get("ref") ?? url.searchParams.get("code"),
            ),
        });
      }
    },
    clear: () => {
      set({ referralCode: null });
      try {
        window.sessionStorage.removeItem(KEY);
      } catch {
        /* Storage may be disabled. */
      }
    },
  }),
);
