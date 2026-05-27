"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { StorefrontBanner } from "@/components/store/templates/types";

type StoreBannerCarouselProps = {
  banners: StorefrontBanner[];
  className?: string;
  heightClassName?: string;
  backgroundClassName?: string;
};

export function StoreBannerCarousel({
  banners,
  className = "",
  heightClassName = "h-[280px] sm:h-[360px] lg:h-[460px]",
  backgroundClassName = "bg-white",
}: StoreBannerCarouselProps) {
  const visibleBanners = useMemo(
    () => banners.filter((banner) => banner.imageUrl),
    [banners],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (visibleBanners.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visibleBanners.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [visibleBanners.length]);

  if (!visibleBanners.length) {
    return null;
  }

  const hasNavigation = visibleBanners.length > 1;

  function goTo(index: number) {
    setActiveIndex(index);
  }

  function previous() {
    setActiveIndex((current) =>
      current === 0 ? visibleBanners.length - 1 : current - 1,
    );
  }

  function next() {
    setActiveIndex((current) => (current + 1) % visibleBanners.length);
  }

  return (
    <section className={`relative w-full overflow-hidden ${backgroundClassName} ${className}`}>
      <div className={`relative w-full ${heightClassName}`}>
        <div
          className="flex h-full w-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {visibleBanners.map((banner, index) => (
            <div key={banner.id} className="relative h-full min-w-full">
              <Image
                src={banner.imageUrl}
                alt={banner.title || "Banner da loja"}
                fill
                priority={index === 0}
                unoptimized
                sizes="100vw"
                className="object-cover object-top"
              />
            </div>
          ))}
        </div>

        {hasNavigation ? (
          <>
            <button
              type="button"
              onClick={previous}
              aria-label="Banner anterior"
              className="absolute left-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg font-black text-slate-900 shadow-lg transition hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Próximo banner"
              className="absolute right-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg font-black text-slate-900 shadow-lg transition hover:bg-white"
            >
              ›
            </button>

            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
              {visibleBanners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => goTo(index)}
                  aria-label={`Ir para banner ${index + 1}`}
                  className={`h-2.5 rounded-full transition ${
                    activeIndex === index ? "w-8 bg-white" : "w-2.5 bg-white/55"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
