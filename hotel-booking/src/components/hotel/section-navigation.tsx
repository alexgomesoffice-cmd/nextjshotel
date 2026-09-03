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
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleSectionsRef = useRef<Set<string>>(new Set());

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
        <div className="flex items-center h-14 overflow-x-auto scrollbar-hide">
          {/* Desktop: flex layout */}
          <div className="hidden md:flex items-center gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => handleSectionClick(e, section.id)}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap',
                  'border border-transparent hover:border-primary/50 hover:bg-primary/5',
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary border-primary/50'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-current={activeSection === section.id ? 'page' : undefined}
              >
                {section.label}
              </a>
            ))}
          </div>

          {/* Mobile: horizontally scrollable */}
          <div className="md:hidden flex items-center gap-2 overflow-x-auto pb-2 pt-2 px-0 scrollbar-hide">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={(e) => handleSectionClick(e, section.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0',
                  'border border-transparent hover:border-primary/50 hover:bg-primary/5',
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary border-primary/50'
                    : 'text-muted-foreground hover:text-foreground'
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
