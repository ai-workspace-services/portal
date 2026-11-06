export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

import { resolveExtensionRouteComponent } from "@extensions/loader";

type ManagementPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function ManagementPage({
  searchParams,
}: ManagementPageProps) {
  const showAgents = (await searchParams).tab === "agents";
  try {
    const Component = await resolveExtensionRouteComponent("/panel/management");
    return <Component showAgents={showAgents} />;
  } catch (error) {
    if (error instanceof Error && error.message.includes("disabled")) {
      redirect("/panel");
    }
    throw error;
  }
}
