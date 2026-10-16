import { redirect } from "next/navigation";

/** Notification links point here; invitations live on the societies page. */
export default function InvitationsPage() {
  redirect("/dashboard/societies");
}
