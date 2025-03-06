"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import RippleCard from "@/components/ripple/ripple-card"
import { SelectDeed } from "@/db/schema"

interface DeedListProps {
  deeds: SelectDeed[]
}

export default function DeedList({ deeds }: DeedListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Ripples of Kindness</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {deeds.length === 0 ? (
            <div className="text-muted-foreground py-8 text-center">
              No deeds recorded yet. Be the first to create a ripple!
            </div>
          ) : (
            <div className="space-y-4">
              {deeds.map(deed => (
                <RippleCard key={deed.id} deed={deed} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
