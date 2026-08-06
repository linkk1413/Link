import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { BannerSlide } from "@/types";
import { cn } from "@/lib/utils";

interface BannerSliderProps {
  slides?: BannerSlide[];
  isActive?: boolean;
}

const AUTOPLAY_MS = 4000;

// Promotional slider card for the home screen. Renders nothing when there's
// no admin-configured slide — no placeholder content.
export const BannerSlider: React.FC<BannerSliderProps> = ({
  slides,
  isActive,
}) => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.dir() === "rtl";
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnapCount, setScrollSnapCount] = useState(0);
  const autoplayTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAutoplay = useCallback(() => {
    if (autoplayTimer.current) {
      clearInterval(autoplayTimer.current);
      autoplayTimer.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    stopAutoplay();
    if (!api || !slides || slides.length <= 1) return;
    autoplayTimer.current = setInterval(() => api.scrollNext(), AUTOPLAY_MS);
  }, [api, slides, stopAutoplay]);

  useEffect(() => {
    if (!api) return;

    setScrollSnapCount(api.scrollSnapList().length);
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);

    startAutoplay();
    api.on("pointerDown", stopAutoplay);
    api.on("pointerUp", startAutoplay);

    return () => {
      stopAutoplay();
      api.off("select", onSelect);
      api.off("reInit", onSelect);
      api.off("pointerDown", stopAutoplay);
      api.off("pointerUp", startAutoplay);
    };
  }, [api, startAutoplay, stopAutoplay]);

  if (!isActive || !slides || slides.length === 0) return null;

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl">
      <Carousel
        setApi={setApi}
        opts={{ loop: slides.length > 1, direction: isRTL ? "rtl" : "ltr" }}
      >
        <CarouselContent className="ml-0">
          {slides.map((slide) => (
            <CarouselItem key={slide.id} className="basis-full pl-0">
              <button
                type="button"
                onClick={() => slide.linkUrl && navigate(slide.linkUrl)}
                disabled={!slide.linkUrl}
                className="block w-full bg-muted"
              >
                <img
                  src={slide.imageUrl}
                  alt=""
                  className="aspect-[2/1] w-full object-contain"
                />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {scrollSnapCount > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: scrollSnapCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => api?.scrollTo(index)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === selectedIndex
                  ? "w-4 bg-white"
                  : "w-1.5 bg-white/50",
              )}
              aria-label={`${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSlider;
