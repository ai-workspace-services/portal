import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OpsAccountTriage from "../components/OpsAccountTriage";
const state = vi.hoisted(() => ({role:"operator"}));
vi.mock("next/navigation",()=>({usePathname:()=>"/panel/ops/accounts",useSearchParams:()=>new URLSearchParams()}));
vi.mock("@lib/userStore",()=>({useUserStore:(selector: (s: unknown)=>unknown)=>selector({user:{role:state.role,isRoot:state.role==="root",isAdmin:state.role==="admin"}})}));
vi.mock("../components/OpsAuditConsole",()=>({default:()=>null}));
vi.mock("../components/OpsPlanCatalog",()=>({default:()=>null}));
vi.mock("swr",()=>({default:(key:string)=>({isLoading:false,mutate:vi.fn(),data:key?.endsWith("/accounts")?[{id:"target-id",email:"target@example.invalid",active:true}]:{user:{id:"target-id",email:"target@example.invalid"},billingProfile:{includedQuotaBytes:100},quotaState:{remainingIncludedQuota:4}}})}));
afterEach(()=>vi.unstubAllGlobals());
describe("monthly usage reset",()=>{
 it("requires a reason and submits the selected email only after confirmation",async()=>{
  state.role="operator";
  const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({})});vi.stubGlobal("fetch",fetcher);
  render(<OpsAccountTriage/>);
  fireEvent.click(screen.getAllByText("target@example.invalid")[0]);
  fireEvent.click(screen.getByText("重置本月用量"));
  expect(screen.getByRole("dialog").textContent).toContain("target@example.invalid");
  expect(screen.getByRole("dialog").textContent).toContain("UTC");
  fireEvent.click(screen.getByText("确认变更"));expect(fetcher).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("textbox",{name:/操作原因/}),{target:{value:"support correction"}});
  fireEvent.click(screen.getByText("确认变更"));
  await waitFor(()=>expect(fetcher).toHaveBeenCalled());
  expect(fetcher.mock.calls[0][0]).toContain("target-id/reset-monthly-usage");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({email:"target@example.invalid",reason:"support correction"});
 });
 it("hides the reset action for ordinary users",()=>{
  state.role="user";render(<OpsAccountTriage/>);expect(screen.queryByText("重置本月用量")).toBeNull();
 });
});
