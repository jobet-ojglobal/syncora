// schemas/team-member.schema.ts
import { z } from "zod";

export const teamMemberSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Team member display identity name is required"),
  email: z.string().email("A valid internal corporate email address is required"),
  isActive: z.boolean(),
  canBeSalesRep: z.boolean(),
  accessAllLocations: z.boolean(),
  
  // Handled as array of string tokens mapped to structural relation tables
  accessRights: z.array(z.string()),
  locationInflowIds: z.array(z.string()),
});

export type TeamMemberInput = z.infer<typeof teamMemberSchema>;