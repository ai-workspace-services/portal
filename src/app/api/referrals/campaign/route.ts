import { NextRequest, NextResponse } from "next/server";
import { resolveForwardedHost } from "@/server/account/requestHost";
import { getAccountServiceBaseUrl } from "@/server/serviceConfig";
import { isReferralCampaign } from "@/lib/referral-campaign";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const response = await fetch(
      `${getAccountServiceBaseUrl(resolveForwardedHost(request))}/api/referrals/campaign`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || !isReferralCampaign(payload?.campaign))
      throw new Error("campaign_unavailable");
    const {
      revision,
      enabled,
      active,
      startsAt,
      endsAt,
      cashbackBps,
      annualBonusDays,
    } = payload.campaign;
    return NextResponse.json(
      {
        campaign: {
          revision,
          enabled,
          active,
          startsAt,
          endsAt,
          cashbackBps,
          annualBonusDays,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "account_service_unavailable" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
