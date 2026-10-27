/** Sentinel value for the admin header “All workspaces” option. */
export const ADMIN_ALL_WORKSPACES = "__all__";

export function isAdminAllWorkspacesValue(organizationId: string | null | undefined): boolean {
  if (organizationId == null) return true;
  const trimmed = organizationId.trim();
  return trimmed === "" || trimmed === ADMIN_ALL_WORKSPACES;
}

/** Prisma `where` fragment for org-scoped admin lists. Empty when viewing All. */
export function adminOrgWhere(
  activeOrganizationId: string | null | undefined,
): { organizationId: string } | Record<string, never> {
  if (!activeOrganizationId) return {};
  return { organizationId: activeOrganizationId };
}

/** Prisma `where` fragment when filtering the Organization model itself. */
export function adminOrganizationIdWhere(
  activeOrganizationId: string | null | undefined,
): { id: string } | Record<string, never> {
  if (!activeOrganizationId) return {};
  return { id: activeOrganizationId };
}
