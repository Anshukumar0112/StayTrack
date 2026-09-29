"use client";

import { useEffect, useState, useRef } from "react";
import { ACCOMMODATION_CATEGORIES } from "@/lib/categories";

export default function CategoryNavigation() {
  const [activeCategory, setActiveCategory] = useState<string>("BNB");
  const [isSticky, setIsSticky] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth scroll handler with precise offset for sticky header & global nav
  const scrollToCategory = (categoryId: string) => {
    setActiveCategory(categoryId);
    const targetId = categoryId.toLowerCase(); // e.g. 'bnb', 'hostel', 'pg', 'hotel', 'flat'
    const targetElement = document.getElementById(targetId) || document.getElementById(`${targetId}s`);

    if (targetElement) {
      const headerOffset = 120; // 60px global navbar + 50px category navbar + 10px margin
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    // IntersectionObserver to update active category tab as user scrolls
    const categoryIds = ACCOMMODATION_CATEGORIES.map((c) => c.id);
    const observerOptions = {
      root: null,
      rootMargin: "-20% 0px -60% 0px", // Trigger when section enters top portion of viewport
      threshold: 0,
    };

    const handleIntersect: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id; // 'bnb', 'hostel', 'pg', 'hotel', 'flat'
          const matched = categoryIds.find(
            (id) => id.toLowerCase() === sectionId || `${id.toLowerCase()}s` === sectionId
          );
          if (matched) {
            setActiveCategory(matched);
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersect, observerOptions);

    categoryIds.forEach((id) => {
      const el = document.getElementById(id.toLowerCase()) || document.getElementById(`${id.toLowerCase()}s`);
      if (el) observer.observe(el);
    });

    // Detect sticky state for subtle visual padding transition
    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // Container becomes sticky when top touches global header offset (~60px)
        setIsSticky(rect.top <= 62);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div ref={containerRef} className="sticky top-[57px] sm:top-[61px] z-40 w-full transition-all duration-300">
      <div
        className={`w-full transition-all duration-300 border-y ${
          isSticky
            ? "bg-white/90 backdrop-blur-md border-zinc-200 shadow-md py-2"
            : "bg-white/60 backdrop-blur-sm border-zinc-100 py-3"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between gap-4">
          {/* Header Title - shrinks on sticky */}
          <div className={`transition-all duration-300 flex items-center gap-2 ${isSticky ? "hidden sm:flex" : "flex"}`}>
            <h2 className="text-sm font-black tracking-wider text-zinc-950 uppercase whitespace-nowrap">
              Explore Stays
            </h2>
            <span className="text-zinc-300 text-xs hidden sm:inline">•</span>
          </div>

          {/* Sticky Category Tabs */}
          <nav
            aria-label="Stay Categories"
            className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto justify-start sm:justify-end"
          >
            {ACCOMMODATION_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-black text-white shadow-sm scale-[1.02]"
                      : "bg-zinc-100/80 text-zinc-700 hover:bg-zinc-200/80 hover:text-black"
                  }`}
                >
                  {cat.icon?.startsWith("/") ? (
                    <img src={cat.icon} alt="" className="w-4 h-4 object-contain" />
                  ) : (
                    <span className="text-sm">{cat.icon}</span>
                  )}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
