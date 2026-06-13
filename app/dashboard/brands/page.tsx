import Link from "next/link";
import {
  BadgePlus,
  ExternalLink,
  Package,
} from "lucide-react";

async function getBrands() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/brands`,
    {
      cache: "no-store",
    }
  );

  return response.json();
}

export default async function BrandsPage() {
  const brands =
    await getBrands();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* HEADER */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900">
              Brands
            </h1>

            <p className="mt-3 text-slate-600">
              Manage product brands and
              manufacturers.
            </p>
          </div>

          <Link
            href="/admin/brands/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 font-semibold text-white hover:bg-indigo-600"
          >
            <BadgePlus className="h-5 w-5" />
            Create Brand
          </Link>
        </div>

        {/* GRID */}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand: any) => (
            <div
              key={brand.id}
              className="rounded-3xl border border-slate-200 bg-white p-8"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-2xl bg-indigo-100 p-4">
                  <Package className="h-6 w-6 text-indigo-600" />
                </div>

                <Link
                  href={`/admin/brands/${brand.id}/edit`}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
                >
                  Edit
                </Link>
              </div>

              <h2 className="mt-6 text-2xl font-black text-slate-900">
                {brand.name}
              </h2>

              <p className="mt-3 line-clamp-3 leading-7 text-slate-600">
                {brand.description ||
                  "No description available."}
              </p>

              <div className="mt-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Products
                  </p>

                  <h3 className="mt-1 text-3xl font-black text-slate-900">
                    {
                      brand._count
                        .products
                    }
                  </h3>
                </div>

                {brand.websiteUrl && (
                  <a
                    href={
                      brand.websiteUrl
                    }
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                  >
                    Website
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}