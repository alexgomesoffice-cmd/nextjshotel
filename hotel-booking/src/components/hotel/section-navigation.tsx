'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { getLenis } from '@/components/ui/SmoothScroll';
import { cn } from '@/lib/utils';

export interface Section {
  id: string;
  label: string;
}

interface SectionNavigationProps {
  sections: Section[];
  className?: string;
}

export default function SectionNavigation({ 
  sections, 
  className 
}: SectionNavigationProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const mobileSectionRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleSectionsRef = useRef<Set<string>>(new Set());
  const programmaticScrollRef = useRef<string | null>(null);
  const scrollUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the active mobile tab visible without changing desktop navigation.
  useEffect(() => {
    if (!activeSection || !mobileNavRef.current) return;

    const container = mobileNavRef.current;
    const activeTab = mobileSectionRefs.current[activeSection];
    if (!activeTab) return;

    const tabs = sections
      .map((section) => mobileSectionRefs.current[section.id])
      .filter((tab): tab is HTMLAnchorElement => Boolean(tab));
    const activeIndex = tabs.indexOf(activeTab);
    const isFirst = activeIndex === 0;
    const isLast = activeIndex === tabs.length - 1;
    const targetLeft = isFirst
      ? 0
      : isLast
        ? container.scrollWidth - container.clientWidth
        : activeTab.offsetLeft - (container.clientWidth - activeTab.offsetWidth) / 2;

    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'smooth',
    });
  }, [activeSection, sections]);

  // Initialize IntersectionObserver for active section detection
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.id;
          if (entry.isIntersecting) {
            visibleSectionsRef.current.add(sectionId);
          } else {
            visibleSectionsRef.current.delete(sectionId);
          }
        });

        // Keep the clicked tab active while smooth scrolling passes other sections.
        if (programmaticScrollRef.current) return;

        // Update active section to the first visible one in order
        if (visibleSectionsRef.current.size > 0) {
          const firstVisibleId = sections.find((s) =>
            visibleSectionsRef.current.has(s.id)
          )?.id;
          if (firstVisibleId) {
            setActiveSection(firstVisibleId);
          }
        }
      },
      {
        root: null,
        // Increased to detect sections earlier and more sensitively
        rootMargin: '-180px 0px -20% 0px',
        threshold: 0,
      }
    );

    // Observe all sections
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element && observerRef.current) {
        observerRef.current.observe(element);
      }
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        visibleSectionsRef.current.clear();
      }
      if (scrollUnlockTimeoutRef.current) {
        clearTimeout(scrollUnlockTimeoutRef.current);
      }
    };
  }, [sections]);

  // Handle scroll for sticky state detection
  useEffect(() => {
    const handleScroll = () => {
      if (navRef.current) {
        const rect = navRef.current.getBoundingClientRect();
        setIsSticky(rect.top <= 72); // 72px is the navbar height
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle section click with smooth scroll
  const handleSectionClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
      e.preventDefault();

      const element = document.getElementById(sectionId);
      if (!element) return;

      // Set active immediately for better UX
      setActiveSection(sectionId);
      programmaticScrollRef.current = sectionId;
      if (scrollUnlockTimeoutRef.current) {
        clearTimeout(scrollUnlockTimeoutRef.current);
      }
      scrollUnlockTimeoutRef.current = setTimeout(() => {
        programmaticScrollRef.current = null;
        scrollUnlockTimeoutRef.current = null;
      }, 1500);

      const lenis = getLenis();
      if (lenis) {
        // Use Lenis for smooth scrolling
        lenis.scrollTo(element, {
          offset: -80, // Account for navbar + nav strip height
          duration: 1.2,
        });
      } else {
        // Fallback to native scroll if Lenis is not available
        element.scrollIntoView({ behavior: 'smooth' });
      }
    },
    []
  );

  return (
    <nav
      ref={navRef}
      className={cn(
        'sticky top-[72px] z-40 w-full bg-background/95 backdrop-blur-sm border-b border-border/50 transition-all duration-300',
        isSticky && 'shadow-sm',
        className
      )}
    >
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        <div className="flex h-14 items-center overflow-hidden">
          {/* Desktop: flex layout */}
          <div className="hidden md:flex items-center gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => handleSectionClick(e, section.id)}
                className={cn(
                  'px-3 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap border-b-2 border-transparent outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0',
                  'hover:text-foreground',
                  activeSection === section.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                )}
                aria-current={activeSection === section.id ? 'page' : undefined}
              >
                {section.label}
              </a>
            ))}
          </div>

          {/* Mobile: horizontally scrollable */}
          <div ref={mobileNavRef} className="md:hidden flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-2 pt-2 px-0 scrollbar-hide">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => handleSectionClick(e, section.id)}
                ref={(element) => {
                  mobileSectionRefs.current[section.id] = element;
                }}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors duration-200 whitespace-nowrap flex-shrink-0 border-b-2 border-transparent outline-none ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0',
                  'hover:text-foreground',
                  activeSection === section.id
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground'
                )}
                aria-current={activeSection === section.id ? 'page' : undefined}
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Hide scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </nav>
  );
}
