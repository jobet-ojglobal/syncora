// // @/components/admin/TaxCodeForm.tsx
// "use client";

// import { useForm } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { Input } from "@/components/ui/input";
// import { Button } from "@/components/ui/button";
// import { toast } from "sonner";

// interface TaxCodeFormProps {
//   taxingSchemeInflowId: string; // Must pass the parent's global cloud identifier
//   onSuccess?: () => void;      // Callback to refresh data or close drawer
// }

// export function TaxCodeForm({ taxingSchemeInflowId, onSuccess }: TaxCodeFormProps) {
//   const form = useForm({
//     defaultValues: {
//       name: "",
//       tax1Rate: 0,
//       tax2Rate: 0,
//       isActive: true,
//       taxingSchemeId: taxingSchemeInflowId // bound tightly to parent
//     }
//   });

//   const onSubmit = async (values: any) => {
//     try {
//       const response = await fetch("/api/admin/tax-code", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(values),
//       });

//       if (!response.ok) throw new Error("Could not create jurisdictional rate.");

//       toast.success("Jurisdictional tax code assigned successfully.");
//       if (onSuccess) onSuccess();
//     } catch (err: any) {
//       toast.error(err.message);
//     }
//   };

//   return (
//     <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
//       {/* Input layout for Name, Tax1Rate, Tax2Rate here */}
//       <Button type="submit">Save Jurisdiction Code</Button>
//     </form>
//   );
// }