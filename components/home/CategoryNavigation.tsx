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
    <div ref={containerRef} className="sticky top-[57px] sm:top-[61px] z-[20] w-full">
      <div
        className={`w-full transition-all duration-200 border-y ${
          isSticky
            ? "bg-surface/98 backdrop-blur-md border-border shadow-subtle py-2.5"
            : "bg-surface/90 backdrop-blur-md border-border-subtle py-3"
        }`}
      >
        <div className="stay-container flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-xs font-bold tracking-wider text-foreground uppercase whitespace-nowrap">
              Stay Types
            </h2>
            <span className="text-muted/40 text-xs hidden sm:inline">•</span>
          </div>

          {/* Category Tabs */}
          <nav
            role="tablist"
            aria-label="Accommodation Categories"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 w-full sm:w-auto justify-start sm:justify-end"
          >
            {ACCOMMODATION_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              const sectionAnchor = cat.id === "BNB" ? "bnbs" : cat.id === "HOSTEL" ? "hostels" : cat.id === "PG" ? "pgs" : cat.id === "HOTEL" ? "hotels" : "flats";
              return (
                <button
                  key={cat.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={sectionAnchor}
                  onClick={() => scrollToCategory(cat.id)}
                  className={`flex-shrink-0 flex items-center px-4 py-1.5 rounded-xl text-xs transition-all duration-200 cursor-pointer focus-ring select-none ${
                    isActive
                      ? "bg-[#111716] text-white shadow-2xs font-semibold"
                      : "bg-surface text-muted hover:text-foreground hover:bg-surface-muted border border-border font-medium"
                  }`}
                >
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
