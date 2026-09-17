import { redirect } from "next/navigation";

import { getSessionUserId } from "../../actions";
import { UnderConstructionPage } from "../under-construction";

export default async function ChoirPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  return <UnderConstructionPage kicker="Servicios" title="Coro" />;
}
