import { redirect } from "next/navigation";

export default function PlatformBillingPlansRedirect() {
  redirect("/billing-admin/plans");
}
