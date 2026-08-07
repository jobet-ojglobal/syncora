import * as React from "react"
import { Row } from "@tanstack/react-table"
import Image from "next/image"
import { ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { ParsedProduct } from "./columns"
import { ImageViewerDialog } from "@/components/shared/image-viewer"

export const ThumbnailCell = ({ row }: { row: Row<ParsedProduct> }) => {
  const [viewerOpen, setViewerOpen] = React.useState(false)
  const src = row.getValue("thumbnail") as string | null
  const productName = row.getValue("name") as string

  const gallery = [
    {
      src: src,
      label: productName,
      alt: `${productName} Primary Image`,
    },
  ]

  return (
    <>
      <button
        type="button"
        disabled={!src}
        onClick={() => setViewerOpen(true)}
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted overflow-hidden transition-opacity",
          src ? "cursor-pointer hover:opacity-80" : "cursor-default"
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={productName || "Product Image"}
            fill
            sizes="40px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <ImageOff className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <ImageViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        images={gallery}
      />
    </>
  )
}