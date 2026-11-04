import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import RenewalPlanChange from "../RenewalPlanChange";
vi.mock("@modules/billing/catalog", () => ({
  useBillingCatalog: () =>
    new Map([
      [
        "NEW",
        {
          planId: "NEW",
          displayName: "New Pro",
          kind: "subscription",
          active: true,
          stripePriceId: "price_new",
          priceAmount: 5000,
          priceCurrency: "CNY",
          priceUnit: "month",
        },
      ],
    ]),
}));
afterEach(() => vi.unstubAllGlobals());
it("previews zero due now and only schedules after confirmation", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ status: "none" })))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          planId: "NEW",
          amountDue: 0,
          renewalAmount: 5000,
          currency: "CNY",
          effectiveAt: 1900000000,
          previewToken: "signed",
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ status: "scheduled" })),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: "scheduled",
          planId: "NEW",
          effectiveAt: 1900000000,
        }),
      ),
    );
  vi.stubGlobal("fetch", fetcher);
  render(<RenewalPlanChange />);
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText("续费目标套餐"), {
    target: { value: "NEW" },
  });
  await waitFor(() =>
    expect(screen.getByText("预览续费变更")).not.toBeDisabled(),
  );
  fireEvent.click(screen.getByText("预览续费变更"));
  await screen.findByText(/本次应付 0/);
  expect(fetcher).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByText("确认下次续费切换"));
  await screen.findByRole("status");
  expect(JSON.parse(fetcher.mock.calls[2][1].body)).toEqual({
    previewToken: "signed",
  });
  expect(fetcher.mock.calls[2][0]).toBe(
    "/api/auth/stripe/subscription/renewal",
  );
});
