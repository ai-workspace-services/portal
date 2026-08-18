"use client";

import { useState } from "react";

export default function HelpfulButtons({ isChinese }: { isChinese: boolean }) {
  const [voted, setVoted] = useState<"yes" | "no" | null>(null);

  if (voted) {
    return (
      <p className="xds-t-caption">
        {isChinese ? "感谢你的反馈。" : "Thanks for your feedback."}
      </p>
    );
  }

  return (
    <div className="xds-row" style={{ gap: 8, marginTop: 8 }}>
      <button
        type="button"
        className="xds-btn xds-btn-secondary xds-btn-sm"
        onClick={() => setVoted("yes")}
      >
        {isChinese ? "有帮助" : "Yes"}
      </button>
      <button
        type="button"
        className="xds-btn xds-btn-secondary xds-btn-sm"
        onClick={() => setVoted("no")}
      >
        {isChinese ? "没解决" : "No"}
      </button>
    </div>
  );
}
