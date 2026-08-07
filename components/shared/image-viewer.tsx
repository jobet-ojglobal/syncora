"use client"

import * as React from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ImageViewerItem = {
  src: string | null
  alt?: string
  label?: string | null
}

interface ImageViewerDialogProps {
  images: ImageViewerItem[]
  initialIndex?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImageViewerDialog({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
}: ImageViewerDialogProps) {
  // Filter out items without a valid source, but fall back gracefully if none exist
  const validImages = React.useMemo(
    () => images.filter((img): img is ImageViewerItem & { src: string } => Boolean(img.src)),
    [images]
  )

  const [currentIndex, setCurrentIndex] = React.useState(initialIndex)

  // Reset index when modal opens or initialIndex changes
  React.useEffect(() => {
    if (open) {
      const safeIndex = Math.max(0, Math.min(initialIndex, validImages.length - 1))
      setCurrentIndex(safeIndex)
    }
  }, [open, initialIndex, validImages.length])

  const handleNext = React.useCallback(() => {
    if (validImages.length <= 1) return
    setCurrentIndex((prev) => (prev + 1) % validImages.length)
  }, [validImages.length])

  const handlePrev = React.useCallback(() => {
    if (validImages.length <= 1) return
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length)
  }, [validImages.length])

  // Keyboard Navigation
  React.useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, handleNext, handlePrev])

  if (!open) return null

  const activeImage = validImages[currentIndex]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        
        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 outline-none">
          {/* Top Bar: Label & Close Button */}
          <div className="flex items-center justify-between text-white z-10 w-full">
            <div className="flex flex-col gap-0.5 max-w-[70%]">
              {activeImage?.label && (
                <span className="text-sm sm:text-base font-semibold truncate text-white/90">
                  {activeImage.label}
                </span>
              )}
              {validImages.length > 0 && (
                <span className="text-xs text-white/60">
                  {currentIndex + 1} of {validImages.length}
                </span>
              )}
            </div>

            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogPrimitive.Close>
          </div>

          {/* Main Stage */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            {validImages.length > 0 && activeImage ? (
              <div className="relative w-full h-full max-w-5xl max-h-[75vh] flex items-center justify-center">
                <Image
                  src={activeImage.src}
                  alt={activeImage.alt || activeImage.label || "Product Image"}
                  fill
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="object-contain select-none"
                  priority
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-white/50 gap-2">
                <ImageOff className="h-12 w-12" />
                <p className="text-sm">No preview available</p>
              </div>
            )}

            {/* Navigation Arrows */}
            {validImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrev}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/10"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/10"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Navigation Strip */}
          {validImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 px-4 max-w-full">
              {validImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-md overflow-hidden border-2 transition-all focus:outline-none",
                    currentIndex === idx
                      ? "border-white opacity-100 ring-2 ring-white/30"
                      : "border-transparent opacity-40 hover:opacity-80"
                  )}
                >
                  <Image
                    src={img.src}
                    alt={img.alt || `Thumbnail ${idx + 1}`}
                    fill
                    sizes="56px"
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}