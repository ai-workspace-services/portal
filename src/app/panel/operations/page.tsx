export const dynamic = "force-dynamic";

import { resolveExtensionRouteComponent } from "@extensions/loader";

export default async function PanelOperationsPage() {
  const Component = await resolveExtensionRouteComponent("/panel/operations");
  return <Component />;
}
