import { prisma } from "@/lib/prisma";
import { getTeamMembers } from "../data/team-members";
import { AccessRight, UserRole } from "@/generated/prisma/enums";

type SyncOptions = {
  onProgress?: (processedCount: number) => Promise<void>;
  batchSize?: number;
};

export class TeamMemberSyncService {
  async sync(options?: SyncOptions) {
    const BATCH_SIZE = options?.batchSize ?? 100;

    let after: string | undefined;
    let totalProcessed = 0;

    console.log("Starting unified team member and user unification sync...");

    while (true) {
      const batch = await getTeamMembers(BATCH_SIZE, after);

      if (!batch || !batch.length) {
        break;
      }

      try {
        await prisma.$transaction(
          async (tx) => {
            for (const member of batch) {
              const cleanEmail = member.email?.trim().toLowerCase();

              // 1. Upsert the base TeamMember profile from inFlow
              const teamMember = await tx.teamMember.upsert({
                where: {
                  inflowId: member.teamMemberId,
                },
                create: {
                  inflowId: member.teamMemberId,
                  name: member.name,
                  email: cleanEmail,
                  isActive: member.isActive,
                  canBeSalesRep: member.canBeSalesRep,
                  accessAllLocations: member.accessAllLocations,
                },
                update: {
                  name: member.name,
                  email: cleanEmail,
                  isActive: member.isActive,
                  canBeSalesRep: member.canBeSalesRep,
                  accessAllLocations: member.accessAllLocations,
                },
              });

              // 2. SELF-HEALING LINK: Auto-unify with auth User profiles via email match
              if (cleanEmail) {
                const existingUser = await tx.user.findUnique({
                  where: { email: cleanEmail },
                  select: { id: true, role: true, teamMemberId: true }
                });

                if (existingUser) {
                  // Determine an upgraded workspace role if they are currently just a "Customer"
                  let targetRole: UserRole = existingUser.role;
                  if (existingUser.role === UserRole.Customer) {
                    // Look through active rights keywords to choose the best operational role matching your UserRole enum
                    const stringRights = member.accessRights.map((r: string) => r.toLowerCase());
                    if (stringRights.includes("admin") || stringRights.includes("fullaccess")) {
                      targetRole = UserRole.Admin;
                    } else if (stringRights.includes("inventory") || stringRights.includes("stock")) {
                      targetRole = UserRole.InventoryClerk;
                    } else if (stringRights.includes("sales")) {
                      targetRole = UserRole.SalesAssociate;
                    } else {
                      targetRole = UserRole.WarehouseStaff; // Safe employee operational baseline
                    }
                  }

                  // Establish the 1-to-1 foreign key reference link and update privileges
                  await tx.user.update({
                    where: { id: existingUser.id },
                    data: {
                      teamMemberId: teamMember.id,
                      role: targetRole
                    },
                  });
                }
              }

              /**
               * 3. Sync Access Rights
               */
              await tx.teamMemberAccessRight.deleteMany({
                where: {
                  teamMemberId: teamMember.id,
                },
              });

              const validRights = member.accessRights.filter(
                (right): right is AccessRight =>
                  Object.values(AccessRight).includes(right as AccessRight)
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

              /**
               * 4. Sync Location Access privileges
               */
              await tx.teamMemberLocation.deleteMany({
                where: {
                  teamMemberId: teamMember.id,
                },
              });

              if (
                !member.accessAllLocations &&
                member.accessLocationIds?.length > 0
              ) {
                await tx.teamMemberLocation.createMany({
                  data: member.accessLocationIds.map(
                    (locationInflowId: string) => ({
                      teamMemberId: teamMember.id,
                      locationInflowId,
                    })
                  ),
                  skipDuplicates: true,
                });
              }
            }
          },
          {
            timeout: 60000,
          }
        );
      } catch (error) {
        console.error(
          `Failed syncing team member batch ending at ${after}`,
          error
        );
        throw error;
      }

      totalProcessed += batch.length;

      if (options?.onProgress) {
        await options.onProgress(totalProcessed);
      }

      after = batch[batch.length - 1]?.teamMemberId;

      if (batch.length < BATCH_SIZE) {
        break;
      }
    }

    return {
      membersProcessed: totalProcessed,
      syncedAt: new Date().toISOString(),
    };
  }
}