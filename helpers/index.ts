import { Prisma } from "@/generated/prisma/client";

export const locationStatusColors = {
  Online: "bg-emerald-500 text-white shadow-emerald-100",
  Offline: "bg-slate-500 text-white shadow-slate-100",
  Maintenance: "bg-amber-500 text-white shadow-amber-100"
};

export const toDecimal = (value: string | number | null | undefined): Prisma.Decimal | null => {
  if (value === null || value === undefined || value === "") return null;
  return new Prisma.Decimal(value);
};