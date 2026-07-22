// services/sync/products/team-member.sync.ts
import { Prisma } from "@/generated/prisma/client";
import { AccessRight, UserRole } from "@/generated/prisma/enums";
import { InflowTeamMember } from "../types";

type Tx = Prisma.TransactionClient;

/**
 * Syncs a single team member payload into the local database using an ongoing Prisma transaction.
 */
export async function syncTeamMember(tx: Tx, member: InflowTeamMember) {
  const cleanEmail = member.email?.trim().toLowerCase();

  const payload = {
    name: member.name,
    email: cleanEmail,
    isActive: member.isActive,
    canBeSalesRep: member.canBeSalesRep,
    accessAllLocations: member.accessAllLocations,
  };

  // 1. Upsert the base TeamMember profile from inFlow
  const teamMember = await tx.teamMember.upsert({
    where: {
      inflowId: member.teamMemberId,
    },
    create: {
      ...payload,
      inflowId: member.teamMemberId,
      isInternal: member.isInternal,
    },
    update: payload,
  });

  // 2. SELF-HEALING LINK: Auto-unify with auth User profiles via email match
  if (cleanEmail) {
    const existingUser = await tx.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, role: true, teamMemberId: true },
    });

    if (existingUser) {
      let targetRole: UserRole = existingUser.role;

      if (existingUser.role === UserRole.Customer) {
        const stringRights = (member.accessRights || []).map((r: string) => r.toLowerCase());
        
        if (stringRights.includes("admin") || stringRights.includes("fullaccess")) {
          targetRole = UserRole.Admin;
        } else if (stringRights.includes("inventory") || stringRights.includes("stock")) {
          targetRole = UserRole.InventoryClerk;
        } else if (stringRights.includes("sales")) {
          targetRole = UserRole.SalesAssociate;
        } else {
          targetRole = UserRole.WarehouseStaff;
        }
      }

      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          teamMemberId: teamMember.inflowId ?? teamMember.id,
          role: targetRole,
        },
      });
    }
  }

  // 3. Sync Access Rights (Purge-and-Recreate)
  await tx.teamMemberAccessRight.deleteMany({
    where: { teamMemberId: teamMember.id },
  });

  if (member.accessRights && member.accessRights.length > 0) {
    const validRights = member.accessRights.filter(
      (right): right is AccessRight => Object.values(AccessRight).includes(right as AccessRight)
    );

    if (validRights.length > 0) {
      await tx.teamMemberAccessRight.createMany({
        data: validRights.map((rightName) => ({
          teamMemberId: teamMember.id,
          rightName,
        })),
        skipDuplicates: true,
      });
    }
  }

  // 4. Sync Location Access Privileges
  await tx.teamMemberLocation.deleteMany({
    where: { teamMemberId: teamMember.id },
  });

  if (!member.accessAllLocations && member.accessLocationIds?.length) {
    await tx.teamMemberLocation.createMany({
      data: member.accessLocationIds.map((locationInflowId: string) => ({
        teamMemberId: teamMember.id,
        locationInflowId,
      })),
      skipDuplicates: true,
    });
  }

  return teamMember;
}