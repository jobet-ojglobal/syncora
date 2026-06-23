import { inflow } from "@/lib/inflow/inflow.client";
import { InflowTeamMember } from "../types";

export async function getTeamMembers( count = 100,
  after?: string
) {
  const params = new URLSearchParams({
    count: String(count),
  });

  if (after) {
    params.append("after", after);
  }

  return await inflow.get<InflowTeamMember[]>(
    `/team-members?${params.toString()}`
  );
}

export async function getTeamMember(memberId: string) {
  return inflow.get<InflowTeamMember>(
    `/team-members/${memberId}`
  );
}