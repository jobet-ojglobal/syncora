import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  ProductForm,
} from "@/components/products/admin/product-form";

export default function Page() {
  return (
    <div className="container max-w-3xl py-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Create Product
          </CardTitle>
        </CardHeader>

        <CardContent>
          <ProductForm />
        </CardContent>
      </Card>
    </div>
  );
}