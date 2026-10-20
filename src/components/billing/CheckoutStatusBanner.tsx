"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

type CheckoutStatusBannerProps = {
  className?: string;
};

export default function CheckoutStatusBanner({
  className,
}: CheckoutStatusBannerProps) {
  const searchParams = useSearchParams();
  const checkoutStatus = searchParams.get("checkout");

  const message = useMemo(() => {
    switch (checkoutStatus) {
      case "success":
        return {
          tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
          text: "已返回支付页面，正在核验付款与权益状态，请勿重复购买。",
        };
      case "cancelled":
        return {
          tone: "border-amber-200 bg-amber-50 text-amber-800",
          text: "你已返回账户；付款结果以核验后的账单状态为准。",
        };
      default:
        return null;
    }
  }, [checkoutStatus]);

  if (!message) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${message.tone} ${className ?? ""}`.trim()}
    >
      {message.text}
    </div>
  );
}
