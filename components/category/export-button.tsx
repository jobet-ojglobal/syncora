"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button"; // Adjust to your UI library / path
import { toast } from "sonner"; // Optional notification toast

interface ExportCategoryCsvButtonProps {
  endpoint?: string;
  filename?: string;
  className?: string;
}

export function ExportCategoryCsvButton({
  endpoint = "/api/admin/categories/export",
  filename = "category_products_export.csv",
  className,
}: ExportCategoryCsvButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExportCsv = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch export data from server.");
      }

      const result = await response.json();

      if (!result.data || !Array.isArray(result.data)) {
        throw new Error("Invalid response format received.");
      }

      // Prepare CSV content headers and rows
      const headers = ["ProductName", "Category"];
      
      const csvRows = [
        headers.join(","), // CSV Header Row
        ...result.data.map((row: { productName: string; categoryName: string }) => {
          // Escape quotes and wrap string in double quotes to preserve commas
          const cleanProductName = `"${(row.productName || "").replace(/"/g, '""')}"`;
          const cleanCategoryName = `"${(row.categoryName || "").replace(/"/g, '""')}"`;
          
          return `${cleanProductName},${cleanCategoryName}`;
        }),
      ];

      const csvContent = csvRows.join("\n");

      // Create a Blob with UTF-8 encoding (including BOM for Excel compatibility)
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      // Trigger automatic browser download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      // Cleanup DOM object
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("CSV file exported successfully!");
    } catch (error: any) {
      console.error("CSV Export error:", error);
      toast.error(error.message || "An error occurred while generating the CSV file.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExportCsv}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating CSV...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Export Categories CSV
        </>
      )}
    </Button>
  );
}