// app/dashboard/products/create/page.tsx
import { ProductGroupForm } from "@/components/products/group-form";
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
          <ProductGroupForm
          initialData={{
          id: "grp1",
          name: "Sony A7 IV",
          categoryId: "camera",
          brandId: "sony",
          isActive: true,
          tags: [
            { value: "mirrorless" },
            { value: "full-frame" },
          ],
          features: [
            { key: "Sensor", value: "Full Frame" },
            { key: "Megapixels", value: "33MP" },
          ],
          options: [
            {
              name: "Color",
              attributeId: "attr_color",
              values: [
                { value: "Black" },
                { value: "Silver" },
              ],
            },
            {
              name: "Lens Kit",
              attributeId: "attr_lens",
              values: [
                { value: "Body Only" },
                { value: "28-70mm" },
              ],
            },
          ],
        }} />
        </CardContent>
      </Card>
    </div>
  );
}