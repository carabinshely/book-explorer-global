import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  alt: string;
}

export function ImageGallery({ images, alt }: ImageGalleryProps) {
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Use placeholders if no images
  const galleryImages = images.length > 0 
    ? images 
    : ['/placeholder.svg'];

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => 
      prev === 0 ? galleryImages.length - 1 : prev - 1
    );
  }, [galleryImages.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => 
      prev === galleryImages.length - 1 ? 0 : prev + 1
    );
  }, [galleryImages.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    }
  }, [goToPrevious, goToNext]);

  return (
    <div 
      className="space-y-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Image gallery"
    >
      {/* Main Image */}
      <div className="relative aspect-[3/4] bg-muted rounded-lg overflow-hidden shadow-book">
        <img
          src={galleryImages[currentIndex]}
          alt={`${alt} - Image ${currentIndex + 1} of ${galleryImages.length}`}
          className="absolute inset-0 w-full h-full object-cover animate-fade-in"
          key={currentIndex}
        />

        {/* Navigation Arrows */}
        {galleryImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
              onClick={goToPrevious}
              aria-label={t.a11y.gallery_previous}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background"
              onClick={goToNext}
              aria-label={t.a11y.gallery_next}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        {galleryImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-xs text-foreground">
            {currentIndex + 1} / {galleryImages.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {galleryImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {galleryImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "flex-shrink-0 w-16 h-20 rounded overflow-hidden border-2 transition-all",
                currentIndex === index
                  ? "border-accent ring-2 ring-accent/30"
                  : "border-border hover:border-accent/50"
              )}
              aria-label={`View image ${index + 1}`}
              aria-current={currentIndex === index ? 'true' : 'false'}
            >
              <img
                src={image}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
