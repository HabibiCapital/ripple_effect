"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SelectDeed } from "@/db/schema/deeds-schema"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

// Dynamically import the map component to avoid SSR issues
const DynamicMap = dynamic(
  () => import("../../../components/ripple/water-animation"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] animate-pulse rounded-md bg-slate-100"></div>
    )
  }
)

interface RippleMapProps {
  deeds?: SelectDeed[]
  mapLocations?: Array<{
    latitude: number
    longitude: number
    title: string
    impact: number
  }>
}

export default function RippleMap({
  deeds = [],
  mapLocations = []
}: RippleMapProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Global Ripple Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] overflow-hidden rounded-md bg-slate-50">
          {mounted && (
            <DynamicMap
              width={800}
              height={400}
              color="#3b82f6"
              locations={mapLocations}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
