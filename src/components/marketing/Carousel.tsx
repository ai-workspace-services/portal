"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CarouselImage = string | { src: string; width?: number; height?: number };

export type CarouselProps = {
  images: CarouselImage[];
  autoSlideInterval?: number;
};

export default function Carousel({ images, autoSlideInterval = 5000 }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  }, [images.length]);

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  };

  useEffect(() => {
    if (!autoSlideInterval) return;
    const slideTimer = setInterval(nextSlide, autoSlideInterval);
    return () => clearInterval(slideTimer);
  }, [nextSlide, autoSlideInterval]);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full h-full group overflow-hidden bg-slate-100 flex items-center justify-center">
      {/* Images container */}
      <div 
        className="flex transition-transform duration-500 ease-out h-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)`, width: `${images.length * 100}%` }}
      >
        {images.map((img, idx) => {
          const rawSrc = typeof img === 'string' ? img : img.src;
          const width = typeof img === 'string' ? undefined : img.width;
          const height = typeof img === 'string' ? undefined : img.height;
          
          // Encode URI to prevent Next.js from crashing when setting preload headers
          // for images with non-ASCII characters in their filenames.
          const src = encodeURI(rawSrc);

          return (
            <div key={idx} className="relative w-full h-full shrink-0">
              <img 
                src={src} 
                alt={`Slide ${idx + 1}`} 
                width={width}
                height={height}
                className="w-full h-full object-cover"
              />
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button 
            onClick={prevSlide}
            className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/60 hover:bg-white/90 text-slate-800 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            onClick={nextSlide}
            className="absolute top-1/2 right-2 -translate-y-1/2 bg-white/60 hover:bg-white/90 text-slate-800 p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
            aria-label="Next slide"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Navigation Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? "bg-white" : "bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
