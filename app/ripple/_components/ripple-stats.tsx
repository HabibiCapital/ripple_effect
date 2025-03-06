"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Waves } from "lucide-react" // Note: corrected to Waves (plural)

interface RippleStatsProps {
  stats: {
    totalDeeds: number
    totalImpact: number
    recentDeeds: number
  }
}

export default function RippleStatsComponent({ stats }: RippleStatsProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatsCard
            title="Total Acts"
            value={stats.totalDeeds.toString()}
            description="Acts of kindness recorded"
          />
          <StatsCard
            title="Total Impact"
            value={stats.totalImpact.toString()}
            description="Combined impact score"
          />
          <StatsCard
            title="Recent Activity"
            value={stats.recentDeeds.toString()}
            description="New in the last 7 days"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function StatsCard({
  title,
  value,
  description
}: {
  title: string
  value: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-slate-50 p-4">
      <div className="text-primary mb-2">
        <Waves size={24} />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </div>
  )
}
