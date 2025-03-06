import { getDeedsAction, getMapDataAction } from "@/actions/db/deeds-actions"
import { Suspense } from "react"

import RippleMap from "./_components/ripple-map"
import RippleStatsComponent from "./_components/ripple-stats"
import DeedList from "./_components/deed-list"
import DeedForm from "./_components/deed-form"

export default async function RipplePage() {
  const deedsResponse = await getDeedsAction()
  const deeds = deedsResponse.isSuccess ? deedsResponse.data : []

  const mapDataResponse = await getMapDataAction()
  const mapLocations = mapDataResponse.isSuccess ? mapDataResponse.data : []

  // Calculate stats
  const stats = {
    totalDeeds: deeds.length,
    totalImpact: deeds.reduce((sum, deed) => sum + (deed.impact || 1), 0),
    recentDeeds: deeds.filter(deed => {
      const deedDate = new Date(deed.createdAt)
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return deedDate >= weekAgo
    }).length
  }

  return (
    <div className="container space-y-10 py-10">
      <section>
        <h1 className="mb-4 text-4xl font-bold">Ripple Effect</h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Track kindness as it spreads around the world
        </p>
      </section>

      <section>
        <Suspense
          fallback={
            <div className="h-[150px] animate-pulse rounded-md bg-slate-100"></div>
          }
        >
          <RippleStatsComponent stats={stats} />
        </Suspense>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-2xl font-bold">Add Your Ripple</h2>
          <Suspense
            fallback={
              <div className="h-[400px] animate-pulse rounded-md bg-slate-100"></div>
            }
          >
            <DeedForm />
          </Suspense>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold">Recent Ripples</h2>
          <Suspense
            fallback={
              <div className="h-[400px] animate-pulse rounded-md bg-slate-100"></div>
            }
          >
            <DeedList deeds={deeds.slice(0, 5)} />
          </Suspense>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">Global Impact</h2>
        <Suspense
          fallback={
            <div className="h-[400px] animate-pulse rounded-md bg-slate-100"></div>
          }
        >
          <RippleMap mapLocations={mapLocations} />
        </Suspense>
      </section>
    </div>
  )
}
