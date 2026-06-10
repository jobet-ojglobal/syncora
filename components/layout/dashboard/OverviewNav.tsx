"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function OverviewNav({
  items,
}: {
  items: { label: string; url: string }[];
}) {
  const pathname = usePathname();

  return (
    <div className="mt-4 flex items-center gap-3">
      {items.map((item) => {
        // FIX: Overview only matches exactly. Other tabs match exactly OR their sub-routes.
        const isActive =
          item.label === "Overview"
            ? pathname === item.url
            : pathname === item.url || pathname.startsWith(`${item.url}/`);

        return (
          <Link
            key={item.url}
            href={item.url}
            className={clsx(
              "rounded-xl px-4 py-2 text-sm font-semibold border transition",
              isActive
                ? "bg-slate-900 text-white border-slate-900"
                : "hover:bg-slate-100 border-slate-200"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
};