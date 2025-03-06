"use client"

import { format } from "date-fns"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import RippleAnimation from "@/components/ripple/ripple-animation"
import { SelectDeed } from "@/db/schema"

interface RippleCardProps {
  deed: SelectDeed
  color?: string
}

export default function RippleCard({
  deed,
  color = "#3b82f6"
}: RippleCardProps) {
  return (
    <Card className="w-full overflow-hidden">
      <div className="relative">
        <RippleAnimation
          size={300}
          color={color}
          className="absolute -right-32 -top-32 opacity-10"
        />
        <CardHeader className="relative z-10">
          <CardTitle>{deed.title}</CardTitle>
          <CardDescription>
            {" "}
            {format(new Date(deed.createdAt), "MMMM d, yyyy")}{" "}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <p>{deed.description}</p>
          {deed.location && (
            <p className="text-muted-foreground mt-2 text-sm">
              {" "}
              📍 {deed.location}{" "}
            </p>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
