"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/lib/toast";

type ToastKey = string | null;

const successMessages: Record<string, string> = {
  profile: "Profile updated successfully.",
  password: "Password updated successfully.",
  organization_created: "Organization created and activated.",
  organization_switched: "Active organization updated.",
  organization_updated: "Organization name updated.",
  organization_deleted: "Organization deleted successfully.",
};

const errorMessages: Record<string, string> = {
  missing: "Please fill in all required profile fields.",
  exists: "That email is already in use.",
  missing_password: "Please fill in all password fields.",
  nomatch_password: "Passwords do not match.",
  invalid_password: "Current password is incorrect.",
  organization_missing: "Please enter an organization name.",
  organization_name_missing: "Please provide an organization name.",
  organization_select: "Please select an organization.",
  organization_invalid: "You do not have access to that organization.",
  organization_owner_required: "Only organization owners can delete an organization.",
  organization_last: "You cannot delete your last organization.",
  organization_has_members: "Remove other members before deleting this organization.",
  organization_not_empty: "This organization has data and cannot be deleted.",
  organization_read_only: "Admins have view-only access to organizations.",
};

export function ProfileToasts() {
  const searchParams = useSearchParams();
  const lastToast = useRef<ToastKey>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const key = success ? `success:${success}` : error ? `error:${error}` : null;

    if (!key || key === lastToast.current) return;
    lastToast.current = key;

    if (success && successMessages[success]) {
      toast.success(successMessages[success]);
      return;
    }

    if (error && errorMessages[error]) {
      toast.error(errorMessages[error]);
      return;
    }
  }, [searchParams]);

  return null;
}
