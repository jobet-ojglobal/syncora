import Link from "next/link";
import { SearchX } from "lucide-react";

interface NotFoundStateCardProps {
  title?: string;
  description?: string;

  backHref?: string;
  backLabel?: string;

  actionHref?: string;
  actionLabel?: string;
}

export function NotFoundStateCard({
  title = "Resource not found",

  description = "The page or resource you are looking for does not exist, may have been removed, or is temporarily unavailable.",

  backHref = "/admin",
  backLabel = "Back to Dashboard",

  actionHref,
  actionLabel,
}: NotFoundStateCardProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        
        {/* ICON */}
        <div className="flex justify-center">
          <div className="rounded-2xl bg-slate-100 p-5 text-slate-400">
            <SearchX className="h-10 w-10" />
          </div>
        </div>

        {/* CONTENT */}
        <div className="mt-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            {title}
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          
          <Link
            href={backHref}
            className="
              inline-flex items-center justify-center
              rounded-xl border border-slate-200
              px-5 py-3 text-sm font-semibold
              text-slate-700 transition
              hover:bg-slate-100
            "
          >
            {backLabel}
          </Link>

          {actionHref && actionLabel && (
            <Link
              href={actionHref}
              className="
                inline-flex items-center justify-center
                rounded-xl bg-slate-900
                px-5 py-3 text-sm font-semibold
                text-white transition
                hover:bg-slate-800
              "
            >
              {actionLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// =========== EXAMPLE USAGE ==============

{/* <NotFoundStateCard
  title="Product not found"
  description="This product may have been deleted or is no longer accessible."
  backHref="/admin/products"
  backLabel="Back to Products"
  actionHref="/admin/products/create"
  actionLabel="Create Product"
/>

if (!product) {
  return (
    <NotFoundStateCard
      title="Product not found"
      description="The requested product does not exist."
      backHref="/admin/products"
      backLabel="Back to Products"
    />
  );
} */}