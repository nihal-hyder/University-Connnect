import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth/session";

/** Opens the user's only society workspace, or lists them. */
export default async function ManageIndex() {
  const viewer = await requireViewer("/manage");
  if (viewer.memberships.length === 1) redirect(`/manage/${viewer.memberships[0].society.slug}`);
  redirect("/dashboard/societies");
}
