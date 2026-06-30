'use client';

import { useState } from 'react';

interface ExpandableDescriptionProps {
  text?: string | null;
  fallback?: string;
  maxLines?: number;
}

export default function ExpandableDescription({ 
  text, 
  fallback = "No description available.",
  maxLines = 3
}: ExpandableDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const displayText = text || fallback;
  const lines = displayText.split('\n');
  const shouldShowButton = lines.length > maxLines;
  const collapsedText = shouldShowButton ? lines.slice(0, maxLines).join('\n') : displayText;

  return (
    <div>
      <div className=" px-6 prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
        {isExpanded ? displayText : collapsedText}
      </div>
      
      {shouldShowButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 px-6 py-2 pb-6 text-primary font-medium hover:underline focus:outline-none transition-colors"
        >
          {isExpanded ? 'See Less' : 'See More'}
        </button>
      )}
    </div>
  );
}
