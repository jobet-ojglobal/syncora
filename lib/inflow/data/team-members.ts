import { inflow } from "@/lib/inflow/inflow.client";

export interface InflowTeamMember {
  teamMemberId: string;
  accessAllLocations: boolean;
  accessLocationIds: string[];
  accessRights: string[];
  canBeSalesRep: boolean;
  email: string;
  isActive: boolean;
  name: string;
}

export async function getTeamMembers() {
  return await inflow.get<InflowTeamMember>(
      "/team-members"
    );

}