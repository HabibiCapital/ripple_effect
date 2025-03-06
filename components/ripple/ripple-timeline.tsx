"use client"

import { cn } from "@/lib/utils"
import { SelectDeed } from "@/db/schema"
import { format } from "date-fns"

interface RippleTimelineProps {
  deeds: SelectDeed[]
  className?: string
}

export default function RippleTimeline({
  deeds,
  className
}: RippleTimelineProps) {
  // Sort deeds by createdAt descending
  const sortedDeeds = [...deeds].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  return (
    <div className={cn("space-y-8", className)}>
      {sortedDeeds.map((deed, index) => (
        <div key={deed.id} className="relative pb-8 pl-8">
          {/* Line connector */}
          {index < sortedDeeds.length - 1 && (
            <div className="bg-border absolute bottom-0 left-3 top-3 w-0.5" />
          )}
          {/* Circle marker */}
          <div className="border-primary absolute left-0 top-3 flex size-6 items-center justify-center rounded-full border-2">
            <div className="bg-primary size-3 rounded-full" />
          </div>
          {/* Content */}
          <div className="pt-1">
            <p className="text-muted-foreground text-sm">
              {" "}
              {format(new Date(deed.createdAt), "MMMM d, yyyy")}{" "}
            </p>
            <h3 className="mt-1 text-lg font-medium">{deed.title}</h3>
            <p className="mt-1">{deed.description}</p>
            {deed.location && (
              <p className="text-muted-foreground mt-2 text-sm">
                {" "}
                📍 {deed.location}{" "}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
