// // actions/webhook-actions.ts
// "use server";

// import { updateWebhook, findWebhook } from "@/lib/inflow/services/webhook.service";
// import { revalidatePath } from "next/cache";

// export async function toggleWebhookEvent(event: string, enabled: boolean) {
//   try {
//     const current = await findWebhook();
//     if (!current) throw new Error("No active webhook found");

//     let newEvents = [...current.events];
//     if (enabled) {
//       newEvents.push(event as any);
//     } else {
//       newEvents = newEvents.filter((e) => e !== event);
//     }

//     await updateWebhook(current.webHookSubscriptionId, newEvents);
//     revalidatePath("/settings/inflow");
//     return { success: true };
//   } catch (err) {
//     return { success: false, error: err instanceof Error ? err.message : "Failed to update" };
//   }
// }