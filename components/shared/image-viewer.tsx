"use client"

import * as React from "react"
import Image from "next/image"
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react"
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
  maxImageHeight?: string // e.g., "max-h-[40vh]" or "max-h-[500px]"
  maxImageWidth?: string  // e.g., "max-w-xl" or "max-w-2xl"
}

export function ImageViewerDialog({
  images,
  initialIndex = 0,
  open,
  onOpenChange,
  maxImageHeight = "max-h-[50vh]",
  maxImageWidth = "max-w-2xl",
}: ImageViewerDialogProps) {
  // Filter out items without a valid source
  const validImages = React.useMemo(
    () => images.filter((img): img is ImageViewerItem & { src: string } => Boolean(img?.src)),
    [images]
  )

  const [currentIndex, setCurrentIndex] = React.useState(initialIndex)

  const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(null)

  // Zoom & Pan state management
  const [scale, setScale] = React.useState(1)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = React.useState(false)
  const dragStartRef = React.useRef({ x: 0, y: 0 })

  // Reset zoom & pan when image index or modal visibility changes
  const resetZoom = React.useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }, [])

  React.useEffect(() => {
    if (open) {
      const safeIndex = Math.max(0, Math.min(initialIndex, validImages.length - 1))
      setCurrentIndex(safeIndex)
      resetZoom()
    }
  }, [open, initialIndex, validImages.length, resetZoom])

  const handleNext = React.useCallback(() => {
    if (validImages.length <= 1) return
    resetZoom()
    setCurrentIndex((prev) => (prev + 1) % validImages.length)
  }, [validImages.length, resetZoom])

  const handlePrev = React.useCallback(() => {
    if (validImages.length <= 1) return
    resetZoom()
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length)
  }, [validImages.length, resetZoom])

  // Zoom Controls
  const handleZoomIn = React.useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 4))
  }, [])

  const handleZoomOut = React.useCallback(() => {
    setScale((prev) => {
      const nextScale = Math.max(prev - 0.5, 1)
      if (nextScale === 1) setPosition({ x: 0, y: 0 })
      return nextScale
    })
  }, [])

  const handleDoubleClick = React.useCallback(() => {
    if (scale > 1) {
      resetZoom()
    } else {
      setScale(2  )
    }
  }, [scale, resetZoom])

  // Keyboard Shortcuts (Arrow keys for step navigation, + / - for Zooming)
  React.useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") handleNext()
      if (e.key === "ArrowLeft") handlePrev()
      if (e.key === "+" || e.key === "=") handleZoomIn()
      if (e.key === "-") handleZoomOut()
      if (e.key === "0") resetZoom()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, handleNext, handlePrev, handleZoomIn, handleZoomOut, resetZoom])

  // Dragging / Panning handlers for Zoomed state
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return
    e.preventDefault()
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => setIsDragging(false)

  if (!open) return null

  const activeImage = validImages[currentIndex]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        <DialogPrimitive.Content className="fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-6 outline-none select-none">
          {/* Top Bar: Title, Progress, Controls, Close */}
          <div className="flex items-center justify-between text-white z-20 w-full">
            <div className="flex flex-col gap-0.5 max-w-[50%]">
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

            {/* Quick Action Zoom Controls */}
            {validImages.length > 0 && activeImage && (
              <div className="flex items-center gap-1 bg-black/40 border border-white/10 backdrop-blur-md rounded-full px-2 py-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={scale <= 1}
                  className="h-7 w-7 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
                  title="Zoom Out (-)"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono w-12 text-center text-white/80">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={scale >= 4}
                  className="h-7 w-7 rounded-full text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30"
                  title="Zoom In (+)"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                {scale > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetZoom}
                    className="h-7 w-7 rounded-full text-white/80 hover:text-white hover:bg-white/10 ml-1"
                    title="Reset Zoom (0)"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}

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
          <div
            className="relative flex-1 flex items-center justify-center my-4 overflow-hidden cursor-default"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {validImages.length > 0 && activeImage ? (
              <div
                className={cn("relative w-full h-full flex items-center justify-center transition-transform duration-100 ease-out", 
                  maxImageWidth,
                  maxImageHeight
                )}
                style={{
                  transform: `translate3d(${position.x}px, ${position.y}px, 0px) scale(${scale})`,
                  cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                }}
                onDoubleClick={handleDoubleClick}
              >
                <Image
                  src={activeImage.src}
                  alt={activeImage.alt || activeImage.label || "Product Preview Image"}
                  fill
                  sizes="100vw"
                  className="object-contain select-none"
                  priority
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
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/10 z-20"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/10 z-20"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Navigation Strip */}
          {validImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-20 px-4 max-w-full">
              {validImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    resetZoom()
                    setCurrentIndex(idx)
                  }}
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