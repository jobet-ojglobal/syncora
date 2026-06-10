// app/dashboard/products/create/page.tsx
import { ProductGroupForm } from "@/components/products/admin/product-group-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    // Changed container handling to a cleaner, predictable max-width frame
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-semibold tracking-tight">
            Create Product Group
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductGroupForm />
        </CardContent>
      </Card>
    </div>
  );
}