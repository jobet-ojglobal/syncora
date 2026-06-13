import { ProductsTable } from "@/components/products/table";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Products
        </h1>

        <p className="text-muted-foreground">
          Manage synced InFlow products.
        </p>
      </div>

      <ProductsTable />
    </div>
  );
}