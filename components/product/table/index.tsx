"use client";

import useSWR from "swr";
import { columns } from "./columns";
import { DataTable } from "./data-table";

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json());

export function ProductsTable() {
  const { data, isLoading } =
    useSWR(
      "/api/admin/products",
      fetcher,
      {
        refreshInterval: 10000, // 10-second polling
      }
    );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={data ?? []}
      />
    </>
  );
}