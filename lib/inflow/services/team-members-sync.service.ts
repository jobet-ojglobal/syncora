import { prisma } from "@/lib/prisma";
import { getTeamMembers } from "../data/team-members";

type SyncOptions = {
  onProgress?: (progress: number) => Promise<void>;
};

// chatgpt source: https://chatgpt.com/c/6a39052c-0860-83ec-a8b9-7f1bf7dc99dc

export class TeamMembersSyncService {
  async sync(options?: SyncOptions) {
    const members = await getTeamMembers();

    let processed = 0;
    const total = members.length;

    for (const member of members) {
      await prisma.$transaction(async (tx) => {
        const teamMember =
          await tx.teamMember.upsert({
            where: {
              inflowId: member.teamMemberId,
            },
            create: {
              inflowId: member.teamMemberId,
              name: member.name,
              email: member.email,
              isActive: member.isActive,
              canBeSalesRep: member.canBeSalesRep,
              accessAllLocations:
                member.accessAllLocations,
            },
            update: {
              name: member.name,
              email: member.email,
              isActive: member.isActive,
              canBeSalesRep: member.canBeSalesRep,
              accessAllLocations:
                member.accessAllLocations,
            },
          });

        /**
         * Sync permissions
         */
        await tx.teamMemberAccessRight.deleteMany({
          where: {
            teamMemberId: teamMember.id,
          },
        });

        if (member.accessRights.length > 0) {
          await tx.teamMemberAccessRight.createMany({
            data: member.accessRights.map(
              (rightName) => ({
                teamMemberId: teamMember.id,
                rightName,
              })
            ),
            skipDuplicates: true,
          });
        }

        /**
         * Sync location access
         */
        await tx.teamMemberLocation.deleteMany({
          where: {
            teamMemberId: teamMember.id,
          },
        });

        if (
          !member.accessAllLocations &&
          member.accessLocationIds.length > 0
        ) {
          await tx.teamMemberLocation.createMany({
            data: member.accessLocationIds.map(
              (locationInflowId) => ({
                teamMemberId: teamMember.id,
                locationInflowId,
              })
            ),
            skipDuplicates: true,
          });
        }
      });

      processed++;

      await options?.onProgress?.(
        Math.round((processed / total) * 100)
      );
    }

    return {
      membersProcessed: processed,
      syncedAt: new Date().toISOString(),
    };
  }
}