"use server";

import { revalidatePath } from "next/cache";
import { userHasAdminRole } from "@/lib/admin-view-only";
import { getAllowedMenuPathsForUser } from "@/lib/allowed-menu-paths";
import { getValidSession } from "@/lib/auth-session";
import { isHrefAllowedForNav } from "@/lib/nav-access";
import { prisma } from "@/lib/prisma";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VoiceFollowUpResult = { ok: true } | { ok: false; error: string };

export async function setVoiceFollowUpDone(callRecordId: string, done: boolean): Promise<VoiceFollowUpResult> {
  const session = await getValidSession();
  const organizationId = session?.activeOrganizationId;
  if (!session || !organizationId) {
    return { ok: false, error: "Select a workspace and try again." };
  }
  if (!UUID_PATTERN.test(callRecordId)) {
    return { ok: false, error: "That call could not be found." };
  }

  // Same audience that can see the report: admins, or members with voice access.
  if (!(await userHasAdminRole(session.userId))) {
    const [membership, allowedPaths] = await Promise.all([
      prisma.organizationMember.findFirst({
        where: { userId: session.userId, organizationId },
        select: { id: true },
      }),
      getAllowedMenuPathsForUser(session.userId, organizationId),
    ]);
    if (!membership || !isHrefAllowedForNav("/voice-agent", allowedPaths)) {
      return { ok: false, error: "You don’t have access to voice calls." };
    }
  }

  // Scoped to the active workspace, so an id from another workspace changes nothing.
  const { count } = await prisma.retellCall.updateMany({
    where: { id: callRecordId, organizationId },
    data: { followUpDoneAt: done ? new Date() : null },
  });
  if (count === 0) {
    return { ok: false, error: "That call could not be found." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
