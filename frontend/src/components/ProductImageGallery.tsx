import { useState } from "react"
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProductImageGalleryProps {
  images: string[]
  productName: string
  className?: string
}

export function ProductImageGallery({ images, productName, className }: ProductImageGalleryProps) {
  const [mainImage, setMainImage] = useState(images[0])
  const [isZoomed, setIsZoomed] = useState(false)

  const currentIndex = images.indexOf(mainImage)
  
  const nextImage = () => {
    const nextIndex = (currentIndex + 1) % images.length
    setMainImage(images[nextIndex])
  }

  const prevImage = () => {
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
    setMainImage(images[prevIndex])
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Image */}
      <div className="relative group">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-card shadow-card">
          <img
            src={mainImage}
            alt={productName}
            className="w-full h-[500px] object-cover transition-all duration-500 group-hover:scale-105"
          />
          
          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm border shadow-lg hover:bg-white transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-sm border shadow-lg hover:bg-white transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Zoom Icon */}
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/80 backdrop-blur-sm border shadow-lg hover:bg-white transition-all duration-200 opacity-0 group-hover:opacity-100"
          >
            <ZoomIn className="h-5 w-5" />
          </button>

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-black/50 text-white text-sm font-medium">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail Gallery */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <img
              key={index}
              src={img}
              alt={`${productName} ${index + 1}`}
              onClick={() => setMainImage(img)}
              className={cn(
                "gallery-thumbnail flex-shrink-0",
                mainImage === img 
                  ? "gallery-thumbnail-active" 
                  : "gallery-thumbnail-inactive"
              )}
            />
          ))}
        </div>
      )}

      {/* Zoom Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-7xl max-h-full">
            <img
              src={mainImage}
              alt={productName}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}