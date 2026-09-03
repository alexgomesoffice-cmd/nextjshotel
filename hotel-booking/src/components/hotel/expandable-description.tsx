'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HOTEL_LOCATION_COLLAPSED_HEIGHT } from './hotel-location-section';

interface ExpandableDescriptionProps {
  text?: string | null;
  fallback?: string;
  collapsedHeight?: number;
  title?: string;
}

export default function ExpandableDescription({ 
  text, 
  fallback = "No description available.",
  collapsedHeight = HOTEL_LOCATION_COLLAPSED_HEIGHT,
  title,
}: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const displayText = text || fallback;
  const hasDescription = Boolean(text?.trim());

  useEffect(() => {
    const content = contentRef.current;
    if (!content || isExpanded || !hasDescription) return;

    const measure = () => setCanExpand(content.scrollHeight > content.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    return () => observer.disconnect();
  }, [displayText, hasDescription, isExpanded]);

  const toggleExpanded = () => {
    if (canExpand) setIsExpanded((expanded) => !expanded);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === 'Enter' || event.key === ' ') && canExpand) {
      event.preventDefault();
      toggleExpanded();
    }
  };

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl transition-[max-height] duration-1000 ease-in-out ${canExpand ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60' : ''}`}
      style={{ maxHeight: isExpanded ? '200rem' : `${collapsedHeight}px` }}
      role={canExpand ? 'button' : undefined}
      tabIndex={canExpand ? 0 : undefined}
      aria-expanded={canExpand ? isExpanded : undefined}
      aria-controls={canExpand ? contentId : undefined}
      aria-label={canExpand ? (isExpanded ? 'Collapse hotel description' : 'Expand hotel description') : undefined}
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
    >
      {title && <h2 className="m-6 rounded text-2xl font-bold">{title}</h2>}
      <div
        id={contentId}
        ref={contentRef}
        className={`px-6 pb-6 prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap ${isExpanded ? '' : 'min-h-0 flex-1 overflow-hidden'}`}
      >
        {displayText}
      </div>

      {canExpand && !isExpanded && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-center rounded-b-2xl bg-gradient-to-t from-background via-background/90 to-transparent pb-5 pt-12 text-sm font-medium text-primary">
          <span className="flex items-center gap-1">Read more <ChevronDown className="h-4 w-4" /></span>
        </div>
      )}
      {canExpand && isExpanded && (
        <div className="flex justify-center px-6 pb-6 text-sm font-medium text-primary">
          <span className="flex items-center gap-1">Show less <ChevronUp className="h-4 w-4" /></span>
        </div>
      )}
    </div>
  );
}
