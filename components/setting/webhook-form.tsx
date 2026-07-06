// "use client";

// import { Controller, useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { webhookSchema, WebhookFormValues } from "@/schemas/webhook.schema";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
// import {
//   Field,
//   FieldContent,
//   FieldError,
//   FieldGroup,
//   FieldLabel,
// } from "@/components/ui/field"
// import { toast } from "sonner"; // Or your preferred toast utility

// const AVAILABLE_EVENTS = [
//   { id: "order.created", label: "Order Created" },
//   { id: "order.updated", label: "Order Updated" },
//   { id: "stock.updated", label: "Stock/Inventory Updated" },
// ];

// export function WebhookRegisterForm({ branchId }: { branchId: string }) {
//   const {
//       handleSubmit, 
//       control, 
//       watch, 
//       setValue, 
//       reset,
//       register,
//       formState: { errors, isSubmitting }  
//     } = useForm<WebhookFormValues>({
//     resolver: zodResolver(webhookSchema),
//     defaultValues: {
//       url: "",
//       secret: "",
//       events: [],
//     },
//   });

//   async function onSubmit(data: WebhookFormValues) {
//     try {
//       const response = await fetch(`/api/branches/${branchId}/webhooks`, {
//         method: "POST",
//         headers: { "Content-Type": "application/api" },
//         body: JSON.stringify(data),
//       });

//       if (!response.ok) throw new Error("Failed to register webhook");

//       toast.success("Webhook registered successfully!");
//       reset();
//     } catch (error) {
//       toast.error("Something went wrong. Please try again.");
//     }
//   }

//   return (
//       <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl border p-6 rounded-lg">
//         <Controller
//           name="url"
//           control={control}
//           render={({ field, fieldState }) => (
//           <Field data-invalid={fieldState.invalid}>
//             <FieldLabel htmlFor="form-url">
//               Registered Business Legal Name <b className="text-red-500">*</b>
//             </FieldLabel>
//             <Input
//               {...field}
//               id="form-url"
//               aria-invalid={fieldState.invalid}
//               placeholder=""
//               autoComplete="off"
//             />
//             {fieldState.invalid && (
//               <FieldError errors={[fieldState.error]} />
//             )}
//           </Field>
//           )}
//         />

//         <FormField
//           control={form.control}
//           name="secret"
//           render={({ field }) => (
//             <FormItem>
//               <FormLabel>Webhook Secret (Optional)</FormLabel>
//               <FormControl>
//                 <Input type="password" placeholder="e.g., whsec_..." {...field} />
//               </FormControl>
//               <FormDescription>Used to sign the payload header so the branch can verify authenticity.</FormDescription>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         <FormField
//           control={form.control}
//           name="events"
//           render={() => (
//             <FormItem>
//               <div className="mb-4">
//                 <FormLabel>Subscribe to Events</FormLabel>
//                 <FormDescription>Select which occurrences should trigger this webhook.</FormDescription>
//               </div>
//               <div className="grid grid-cols-1 gap-2">
//                 {AVAILABLE_EVENTS.map((event) => (
//                   <FormField
//                     key={event.id}
//                     control={form.control}
//                     name="events"
//                     render={({ field }) => {
//                       return (
//                         <FormItem key={event.id} className="flex flex-row items-start space-x-3 space-y-0">
//                           <FormControl>
//                             <Checkbox
//                               checked={field.value?.includes(event.id)}
//                               onCheckedChange={(checked) => {
//                                 return checked
//                                   ? field.onChange([...field.value, event.id])
//                                   : field.onChange(field.value?.filter((value) => value !== event.id));
//                               }}
//                             />
//                           </FormControl>
//                           <FormLabel className="font-normal">{event.label}</FormLabel>
//                         </FormItem>
//                       );
//                     }}
//                   />
//                 ))}
//               </div>
//               <FormMessage />
//             </FormItem>
//           )}
//         />

//         <Button type="submit" disabled={form.formState.isSubmitting}>
//           {form.formState.isSubmitting ? "Registering..." : "Register Webhook"}
//         </Button>
//       </form>
//   );
// }