import { toAbsolutePublicAssetUrl } from "@/lib/public-upload-url";
import { prisma } from "@/lib/prisma";

export type OrganizationEmailBranding = {
  organizationName: string;
  logoUrl: string | null;
};

async function loadOrganizationRow(
  organizationId: string,
): Promise<{ name: string; logoUrl: string | null } | null> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, logoUrl: true },
    });
    if (!org) return null;
    return { name: org.name, logoUrl: org.logoUrl };
  } catch {
    const rows = await prisma.$queryRaw<Array<{ name: string; logo_url: string | null }>>`
      SELECT name, logo_url
      FROM organizations
      WHERE id = ${organizationId}::uuid
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return null;
    return { name: row.name, logoUrl: row.logo_url };
  }
}

/** Logo for booking emails: organization logo, else connected calendar provider logo. */
export async function loadOrganizationEmailBranding(
  organizationId: string,
  routedProviderId?: string | null,
): Promise<OrganizationEmailBranding> {
  const org = await loadOrganizationRow(organizationId);

  if (!org) {
    return { organizationName: "Workspace", logoUrl: null };
  }

  let logoUrl = toAbsolutePublicAssetUrl(org.logoUrl);

  if (!logoUrl && routedProviderId) {
    const provider = await prisma.provider.findUnique({
      where: { id: routedProviderId },
      select: { logoUrl: true },
    });
    logoUrl = toAbsolutePublicAssetUrl(provider?.logoUrl);
  }

  return {
    organizationName: org.name,
    logoUrl,
  };
}
