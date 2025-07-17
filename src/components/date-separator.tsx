"use client";

import { forwardRef } from 'react';
import { format } from "date-fns";

interface DateSeparatorProps {
  date: string;
}

const DateSeparator = forwardRef<HTMLDivElement, DateSeparatorProps>(({ date }, ref) => {
  return (
    <div ref={ref} className="flex items-center py-4" aria-label={`Messages from ${date}`}>
      <div className="flex-grow border-t border-border"></div>
      <span className="flex-shrink mx-4 text-sm font-medium text-muted-foreground bg-primary/10 px-3 py-1 rounded-full">
        {format(new Date(date), "MMMM d, yyyy")}
      </span>
      <div className="flex-grow border-t border-border"></div>
    </div>
  );
});

DateSeparator.displayName = "DateSeparator";

export default DateSeparator;
