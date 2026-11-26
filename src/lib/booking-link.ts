import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

function slugifyBusinessName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
  return slug || "booking";
}

/**
 * Returns the workspace's booking slug, creating it on first use. The slug is never
 * regenerated (renaming the business must not break printed QR codes).
 */
export async function ensureBookingSlug(organizationId: string): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, bookingSlug: true },
  });
  if (!org) return null;
  if (org.bookingSlug) return org.bookingSlug;

  const base = slugifyBusinessName(org.name);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${crypto.randomUUID().slice(0, 4)}`;
    try {
      // Only fills an empty slug, so two simultaneous first visits agree on one value.
      await prisma.organization.updateMany({
        where: { id: organizationId, bookingSlug: null },
        data: { bookingSlug: candidate },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
    const saved = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { bookingSlug: true },
    });
    return saved?.bookingSlug ?? null;
  }
  return null;
}
