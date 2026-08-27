import * as React from "react"
import Image from "next/image"
import { Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageViewerDialog } from "@/components/shared/image-viewer"

export const ThumbnailViewerCell = ({ row }: { row: { src: string | null; name: string }}) => {
  const [viewerOpen, setViewerOpen] = React.useState(false)

  const gallery = [
    {
      src: row.src,
      label: row.name,
      alt: `${row.name} Primary Image`,
    },
  ]

  return (
    <>
      <button
        type="button"
        disabled={!row.src}
        onClick={() => setViewerOpen(true)}
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted overflow-hidden transition-opacity",
          row.src ? "cursor-pointer hover:opacity-80" : "cursor-default"
        )}
      >
        {}
        {row.src ? (
          <Image
            src={row.src}
            alt={row.name || "Product Image"}
            className="w-full h-full object-cover"
            width={36}
            height={36}
          />
        ) : (
          <Package className="h-4 w-4 text-muted-foreground" />
        )}
        {}
      </button>
        

      <ImageViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        images={gallery}
      />
    </>
  )
}