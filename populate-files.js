const fs = require('fs');
const path = require('path');
const { program } = require('commander');

// Configure command line options
program
  .option('-d, --dry-run', 'Preview changes without making them')
  .option('-f, --force', 'Force update even if file has content')
  .option('-b, --backup', 'Create backups before modifying files', true)
  .option('-g, --group <group>', 'Populate only specific group (auth, core, ui, water, deeds, all)')
  .option('-v, --verbose', 'Display detailed logs')
  .option('-a, --append', 'Append to existing files instead of overwriting (for exports)', true)
  .parse(process.argv);

const options = program.opts();
const isDryRun = options.dryRun;
const forceUpdate = options.force;
const createBackup = options.backup;
const selectedGroup = options.group || 'all';
const isVerbose = options.verbose;
const shouldAppend = options.append;

// Create backup directory if backup is enabled
const backupDir = path.join(process.cwd(), '_file_backups', new Date().toISOString().replace(/:/g, '-'));
if (createBackup && !isDryRun) {
  fs.mkdirSync(backupDir, { recursive: true });
  console.log(`Backup directory created: ${backupDir}`);
}

// Lists of critical files we need special handling for
const APPEND_FILES = [
  'db/schema/index.ts',
  'types/index.ts',
  'db/db.ts'
];

const MERGE_FILES = [
  'app/layout.tsx',
  'components/utilities/providers.tsx'
];

// Function to populate a file
function populateFile(filePath, content) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File doesn't exist: ${filePath} - Creating it...`);
    // Create parent directory if it doesn't exist
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir) && !isDryRun) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!isDryRun) {
      fs.writeFileSync(fullPath, content);
    }
    console.log(`${isDryRun ? '[DRY RUN] Would create' : 'Created'}: ${filePath}`);
    return true;
  }
  
  const existingContent = fs.readFileSync(fullPath, 'utf8');
  
  // Special handling for critical files that need appending
  if (APPEND_FILES.includes(filePath) && shouldAppend) {
    // Check if the content is already in the file
    if (!existingContent.includes(content.trim())) {
      const newContent = existingContent + '\n' + content;
      
      // Backup if needed
      if (createBackup) {
        backupFile(filePath, existingContent);
      }
      
      if (!isDryRun) {
        fs.writeFileSync(fullPath, newContent);
      }
      console.log(`${isDryRun ? '[DRY RUN] Would append to' : 'Appended to'}: ${filePath}`);
      return true;
    } else {
      if (isVerbose) {
        console.log(`Content already in file, skipping append: ${filePath}`);
      }
      return false;
    }
  }
  
  // For normal files, only update if empty or force is specified
  if (existingContent.trim() === '' || forceUpdate) {
    // Backup if needed
    if (createBackup && existingContent.trim() !== '') {
      backupFile(filePath, existingContent);
    }
    
    if (!isDryRun) {
      fs.writeFileSync(fullPath, content);
    }
    console.log(`${isDryRun ? '[DRY RUN] Would populate' : 'Populated file'}: ${filePath}`);
    return true;
  } else {
    if (isVerbose) {
      console.log(`File already has content, skipping: ${filePath}`);
    }
    return false;
  }
}

// Helper function to backup a file
function backupFile(filePath, content) {
  const backupPath = path.join(backupDir, filePath);
  const backupFileDir = path.dirname(backupPath);
  
  if (!isDryRun) {
    fs.mkdirSync(backupFileDir, { recursive: true });
    fs.writeFileSync(backupPath, content);
  }
  console.log(`${isDryRun ? '[DRY RUN] Would backup' : 'Backed up'}: ${filePath}`);
}

// Group file contents by functionality - adjust this to include only Ripple Effect specific content
const fileGroups = {
  core: {
    'db/schema/deeds-schema.ts': `import { pgTable, text, timestamp, uuid, integer, doublePrecision } from "drizzle-orm/pg-core"

export const deedsTable = pgTable("deeds", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  impact: integer("impact").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

export type InsertDeed = typeof deedsTable.$inferInsert
export type SelectDeed = typeof deedsTable.$inferSelect`,

    'db/schema/index.ts': `export * from "./deeds-schema"\n`,
    
    'db/db.ts': `import { deedsTable } from "@/db/schema"\n\n// Add to schema object:\n// deeds: deedsTable,`,
    
    'types/ripple-types.ts': `export interface RippleStats {
  totalDeeds: number
  totalImpact: number
  recentDeeds: number
}

export interface MapLocation {
  latitude: number
  longitude: number
  title: string
  impact: number
}`,

    'types/index.ts': `export * from "./ripple-types"\n`,
  },
  
  deeds: {
    'actions/db/deeds-actions.ts': `"use server"

import { db } from "@/db/db"
import { deedsTable } from "@/db/schema"
import { auth } from "@clerk/nextjs/server"
import { desc, eq } from "drizzle-orm"

export type ActionState<T> =
  | { isSuccess: true; message: string; data: T }
  | { isSuccess: false; message: string; data?: never }

export async function createDeedAction(
  formData: FormData
): Promise<ActionState<undefined>> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        isSuccess: false,
        message: "You must be logged in to create a deed"
      }
    }

    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const location = formData.get("location") as string
    const latitude = parseFloat(formData.get("latitude") as string)
    const longitude = parseFloat(formData.get("longitude") as string)
    const impact = parseInt(formData.get("impact") as string)

    if (!title || !description) {
      return {
        isSuccess: false,
        message: "Title and description are required"
      }
    }

    await db.insert(deedsTable).values({
      userId,
      title,
      description,
      location: location || null,
      latitude: isNaN(latitude) ? null : latitude,
      longitude: isNaN(longitude) ? null : longitude,
      impact: isNaN(impact) ? 1 : impact
    })

    return {
      isSuccess: true,
      message: "Deed created successfully!"
    }
  } catch (error) {
    console.error("Error creating deed:", error)
    return {
      isSuccess: false,
      message: "An error occurred while creating the deed."
    }
  }
}

export async function getDeedsAction(): Promise<
  ActionState<Array<{
    id: string
    title: string
    description: string
    location: string | null
    latitude: number | null
    longitude: number | null
    impact: number
    createdAt: Date
  }>>
> {
  try {
    const { userId } = await auth()

    if (!userId) {
      return {
        isSuccess: false,
        message: "You must be logged in to view deeds"
      }
    }

    const deeds = await db.query.deedsTable.findMany({
      where: eq(deedsTable.userId, userId),
      orderBy: [desc(deedsTable.createdAt)]
    })

    return {
      isSuccess: true,
      message: "Deeds fetched successfully",
      data: deeds
    }
  } catch (error) {
    console.error("Error fetching deeds:", error)
    return {
      isSuccess: false,
      message: "An error occurred while fetching deeds."
    }
  }
}

export async function getMapDataAction(): Promise<
  ActionState<Array<{
    latitude: number
    longitude: number
    title: string
    impact: number
  }>>
> {
  try {
    const deeds = await db.query.deedsTable.findMany({
      where: (deed) => {
        return deed.latitude.isNotNull()
      }
    })

    const mapData = deeds
      .filter(
        (deed) => 
          deed.latitude !== null && 
          deed.longitude !== null
      )
      .map((deed) => ({
        latitude: deed.latitude!,
        longitude: deed.longitude!,
        title: deed.title,
        impact: deed.impact ?? 1
      }))

    return {
      isSuccess: true,
      message: "Map data fetched successfully",
      data: mapData
    }
  } catch (error) {
    console.error("Error fetching map data:", error)
    return {
      isSuccess: false,
      message: "An error occurred while fetching map data."
    }
  }
}

export async function getRippleStatsAction(): Promise<
  ActionState<{
    totalDeeds: number
    totalImpact: number
    recentDeeds: number
  }>
> {
  try {
    const allDeeds = await db.query.deedsTable.findMany()
    
    // Calculate total impact
    const totalImpact = allDeeds.reduce((sum, deed) => sum + (deed.impact || 1), 0)
    
    // Get recent deeds (last 7 days)
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    const recentDeeds = allDeeds.filter(
      deed => new Date(deed.createdAt) >= oneWeekAgo
    ).length
    
    return {
      isSuccess: true,
      message: "Ripple stats fetched successfully",
      data: {
        totalDeeds: allDeeds.length,
        totalImpact,
        recentDeeds
      }
    }
  } catch (error) {
    console.error("Error fetching ripple stats:", error)
    return {
      isSuccess: false,
      message: "An error occurred while fetching ripple stats."
    }
  }
}`
  },
  
  ui: {
    'app/ripple/page.tsx': `"use server"

import { Suspense } from "react"
import { getDeedsAction, getMapDataAction, getRippleStatsAction } from "@/actions/db/deeds-actions"
import DeedForm from "./_components/deed-form"
import DeedList from "./_components/deed-list"
import RippleMap from "./_components/ripple-map"
import RippleStats from "./_components/ripple-stats"

export default async function RipplePage() {
  const deedsResponse = await getDeedsAction()
  const deeds = deedsResponse.isSuccess ? deedsResponse.data : []
  
  const mapDataResponse = await getMapDataAction()
  const mapLocations = mapDataResponse.isSuccess ? mapDataResponse.data : []
  
  const statsResponse = await getRippleStatsAction()
  const rippleStats = statsResponse.isSuccess ? statsResponse.data : {
    totalDeeds: 0,
    totalImpact: 0,
    recentDeeds: 0
  }
  
  return (
    <div className="container py-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">Ripple Effect</h1>
      <p className="text-center text-muted-foreground">
        Track your acts of kindness and see how they create ripples of positive change
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <RippleStats stats={rippleStats} />
          <DeedForm />
        </div>
        
        <div className="space-y-6">
          <Suspense fallback={<div>Loading map...</div>}>
            <RippleMap locations={mapLocations} />
          </Suspense>
          
          <Suspense fallback={<div>Loading deeds...</div>}>
            <DeedList deeds={deeds} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}`,

    'app/ripple/layout.tsx': `"use server"

export default function RippleLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}`,

    'app/ripple/_components/deed-form.tsx': `"use client"

import { useState } from "react"
import { createDeedAction } from "@/actions/db/deeds-actions"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

export default function DeedForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)

    try {
      const result = await createDeedAction(formData)

      if (result.isSuccess) {
        toast({
          title: "Success!",
          description: result.message
        })
        
        // Reset the form
        const form = document.getElementById("deed-form") as HTMLFormElement
        form.reset()
        
        // Refresh the data
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share a New Deed</CardTitle>
        <CardDescription>
          Record your act of kindness so others can be inspired
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="deed-form" action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Helped a neighbor"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe what you did and the impact it had..."
              rows={3}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              name="location"
              placeholder="City, Country"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude (optional)</Label>
              <Input
                id="latitude"
                name="latitude"
                type="number"
                step="0.000001"
                placeholder="40.7128"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude (optional)</Label>
              <Input
                id="longitude"
                name="longitude"
                type="number"
                step="0.000001"
                placeholder="-74.0060"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="impact">Estimated Impact (1-10)</Label>
            <Input
              id="impact"
              name="impact"
              type="number"
              min="1"
              max="10"
              defaultValue="1"
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Deed"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}`,

    'app/ripple/_components/deed-list.tsx': `"use client"

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
            <div className="text-center py-8 text-muted-foreground">
              No deeds recorded yet. Be the first to create a ripple!
            </div>
          ) : (
            <div className="space-y-4">
              {deeds.map((deed) => (
                <RippleCard key={deed.id} deed={deed} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}`,

    'app/ripple/_components/ripple-map.tsx': `"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SelectDeed } from "@/db/schema"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"

// Dynamically import the map component to avoid SSR issues
const DynamicMap = dynamic(() => import("../../../components/ripple/water-animation"), {
  ssr: false,
  loading: () => <div className="h-[400px] bg-slate-100 animate-pulse rounded-md"></div>
})

interface RippleMapProps {
  deeds: SelectDeed[]
}

export default function RippleMap({ deeds }: RippleMapProps) {
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
        <div className="h-[400px] rounded-md overflow-hidden bg-slate-50">
          {mounted && <DynamicMap width={800} height={400} color="#3b82f6" />}
        </div>
      </CardContent>
    </Card>
  )
}`,

    'app/ripple/_components/ripple-stats.tsx': `"use client"

import { Card, CardContent } from "@/components/ui/card"
import { RippleStats } from "@/types"
import { Wave } from "lucide-react"

interface RippleStatsProps {
  stats: RippleStats
}

export default function RippleStatsComponent({ stats }: RippleStatsProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard 
            title="Total Ripples" 
            value={stats.totalDeeds} 
            description="Acts of kindness recorded"
          />
          
          <StatsCard 
            title="Total Impact" 
            value={stats.totalImpact} 
            description="Cumulative impact score"
          />
          
          <StatsCard 
            title="Recent Ripples" 
            value={stats.recentDeeds} 
            description="Last 7 days"
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
  value: number
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-50">
      <div className="text-primary mb-2">
        <Wave size={24} />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <div className="text-3xl font-bold mt-1">{value}</div>
      <p className="text-xs text-muted-foreground mt-1 text-center">{description}</p>
    </div>
  )
}`,

    'components/ripple/water-animation.tsx': `"use client"

import { useEffect, useRef } from 'react'
import { MapLocation } from '@/types'

interface WaterAnimationProps {
  locations: MapLocation[]
}

export default function WaterAnimation({ locations }: WaterAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas dimensions to match container
    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth
        canvas.height = container.clientHeight
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Create ripples for each location
    const ripples: Array<{
      x: number,
      y: number,
      radius: number,
      maxRadius: number,
      opacity: number,
      speed: number,
      title: string
    }> = []

    // Map coordinates to canvas coordinates
    locations.forEach(location => {
      // Simple mapping from lat/long to x/y
      // This is a very simple projection - for a real app you'd want to use a proper map projection
      const x = ((location.longitude + 180) / 360) * canvas.width
      const y = ((90 - location.latitude) / 180) * canvas.height
      
      ripples.push({
        x,
        y,
        radius: 0,
        maxRadius: 20 + (location.impact * 5), // Bigger impact = bigger ripple
        opacity: 0.7,
        speed: 0.5 + (Math.random() * 0.5),
        title: location.title
      })
    })

    // Animation function
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw water background
      ctx.fillStyle = '#e0f7fa'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw simple map outlines - just for visual reference
      ctx.strokeStyle = '#90caf9'
      ctx.lineWidth = 2
      ctx.beginPath()
      // Very simplified world outlines
      // North America
      ctx.moveTo(canvas.width * 0.1, canvas.height * 0.3)
      ctx.lineTo(canvas.width * 0.3, canvas.height * 0.3)
      ctx.lineTo(canvas.width * 0.25, canvas.height * 0.6)
      ctx.lineTo(canvas.width * 0.15, canvas.height * 0.5)
      ctx.closePath()
      
      // Europe & Africa
      ctx.moveTo(canvas.width * 0.45, canvas.height * 0.2)
      ctx.lineTo(canvas.width * 0.55, canvas.height * 0.2)
      ctx.lineTo(canvas.width * 0.5, canvas.height * 0.7)
      ctx.lineTo(canvas.width * 0.45, canvas.height * 0.5)
      ctx.closePath()
      
      // Asia
      ctx.moveTo(canvas.width * 0.6, canvas.height * 0.3)
      ctx.lineTo(canvas.width * 0.8, canvas.height * 0.3)
      ctx.lineTo(canvas.width * 0.75, canvas.height * 0.6)
      ctx.lineTo(canvas.width * 0.65, canvas.height * 0.5)
      ctx.closePath()
      
      ctx.stroke()
      
      // Draw and update ripples
      ripples.forEach((ripple, index) => {
        // Draw ripple
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
        ctx.strokeStyle = \`rgba(25, 118, 210, \${ripple.opacity})\`
        ctx.lineWidth = 2
        ctx.stroke()
        
        // Draw additional ripples
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2)
        ctx.strokeStyle = \`rgba(25, 118, 210, \${ripple.opacity * 0.8})\`
        ctx.lineWidth = 1.5
        ctx.stroke()
        
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, ripple.radius * 0.4, 0, Math.PI * 2)
        ctx.strokeStyle = \`rgba(25, 118, 210, \${ripple.opacity * 0.6})\`
        ctx.lineWidth = 1
        ctx.stroke()
        
        // Draw center point
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#1976d2'
        ctx.fill()
        
        // Draw location name
        ctx.font = '10px Arial'
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
        ctx.textAlign = 'center'
        ctx.fillText(ripple.title, ripple.x, ripple.y - 10)
        
        // Update ripple
        ripple.radius += ripple.speed
        ripple.opacity -= 0.003
        
        // Reset ripple when it gets too big or too transparent
        if (ripple.radius > ripple.maxRadius || ripple.opacity <= 0) {
          ripple.radius = 0
          ripple.opacity = 0.7
        }
      })
      
      requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      window.removeEventListener('resize', resizeCanvas)
    }
  }, [locations])

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full" 
      style={{ display: 'block' }}
    />
  )
}`,

    'components/ripple/ripple-animation.tsx': `"use client"

import { useEffect, useRef } from 'react'

interface RippleAnimationProps {
  size?: number
  color?: string
  speed?: number
  className?: string
}

export default function RippleAnimation({
  size = 200,
  color = '#2563eb',
  speed = 1.5,
  className = ''
}: RippleAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = size
    canvas.height = size

    // Create ripples array
    const ripples: Array<{
      radius: number
      opacity: number
    }> = [
      { radius: 0, opacity: 0.4 },
      { radius: 0, opacity: 0.3 },
      { radius: 0, opacity: 0.2 }
    ]

    let animationFrameId: number

    // Animation function
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Calculate center
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2

      // Draw ripples
      ripples.forEach((ripple, index) => {
        // Draw ripple
        ctx.beginPath()
        ctx.arc(centerX, centerY, ripple.radius, 0, Math.PI * 2)
        ctx.strokeStyle = \`\${color}\${Math.floor(ripple.opacity * 255).toString(16).padStart(2, '0')}\`
        ctx.lineWidth = 2
        ctx.stroke()

        // Update ripple
        ripple.radius += speed
        ripple.opacity -= 0.002 * speed

        // Reset ripple when it gets too big or too transparent
        if (ripple.radius > size / 2 || ripple.opacity <= 0) {
          // Stagger the ripples by delaying their reset
          if (
            (index === 0) ||
            (index === 1 && ripples[0].radius > 20) ||
            (index === 2 && ripples[1].radius > 20)
          ) {
            ripple.radius = 0
            ripple.opacity = 0.4 - (index * 0.1)
          }
        }
      })

      // Draw center point
      ctx.beginPath()
      ctx.arc(centerX, centerY, 5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [size, color, speed])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
    />
  )
}`,

    'components/ripple/ripple-card.tsx': `"use client"

import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import RippleAnimation from "@/components/ripple/ripple-animation"
import { SelectDeed } from "@/db/schema"

interface RippleCardProps {
  deed: SelectDeed
  color?: string
}

export default function RippleCard({ deed, color = "#3b82f6" }: RippleCardProps) {
  return (
    <Card className="w-full overflow-hidden">
      <div className="relative">
        <RippleAnimation size={300} color={color} className="absolute -top-32 -right-32 opacity-10" />
        <CardHeader className="relative z-10">
          <CardTitle>{deed.title}</CardTitle>
          <CardDescription> {format(new Date(deed.createdAt), "MMMM d, yyyy")} </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <p>{deed.description}</p>
          {deed.location && (
            <p className="text-sm text-muted-foreground mt-2"> 📍 {deed.location} </p>
          )}
        </CardContent>
      </div>
    </Card>
  )
}`,

'components/ripple/ripple-timeline.tsx': `"use client"

import { cn } from "@/lib/utils"
import { SelectDeed } from "@/db/schema"
import { format } from "date-fns"

interface RippleTimelineProps {
  deeds: SelectDeed[]
  className?: string
}

export default function RippleTimeline({ deeds, className }: RippleTimelineProps) {
  // Sort deeds by createdAt descending
  const sortedDeeds = [...deeds].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return (
    <div className={cn("space-y-8", className)}>
      {sortedDeeds.map((deed, index) => (
        <div key={deed.id} className="relative pl-8 pb-8">
          {/* Line connector */}
          {index < sortedDeeds.length - 1 && (
            <div className="absolute left-3 top-3 bottom-0 w-0.5 bg-border" />
          )}
          {/* Circle marker */}
          <div className="absolute left-0 top-3 h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-primary" />
          </div>
          {/* Content */}
          <div className="pt-1">
            <p className="text-sm text-muted-foreground"> {format(new Date(deed.createdAt), "MMMM d, yyyy")} </p>
            <h3 className="text-lg font-medium mt-1">{deed.title}</h3>
            <p className="mt-1">{deed.description}</p>
            {deed.location && (
              <p className="text-sm text-muted-foreground mt-2"> 📍 {deed.location} </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}`
  },

  // Add Water Ripple Animation
  water: {
    'components/ripple/water-animation.tsx': `"use client"

import { useEffect, useRef } from "react"

interface WaterAnimationProps {
  className?: string
  width?: number
  height?: number
  color?: string
  speed?: number
}

export default function WaterAnimation({
  className = "",
  width = 400,
  height = 200,
  color = "#3b82f6",
  speed = 0.03
}: WaterAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let time = 0

    // Animation function
    const animate = () => {
      time += speed
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Draw waves
      ctx.beginPath()
      // Start at the left edge
      ctx.moveTo(0, canvas.height / 2)
      
      // Draw the wave across the canvas
      for (let x = 0; x < canvas.width; x++) {
        // Calculate multiple sine waves with different amplitudes and frequencies
        const y1 = Math.sin(x * 0.01 + time) * 20
        const y2 = Math.sin(x * 0.02 + time * 1.5) * 10
        const y3 = Math.sin(x * 0.005 + time * 0.5) * 15
        
        // Combine the waves
        const y = canvas.height / 2 + y1 + y2 + y3
        ctx.lineTo(x, y)
      }
      
      // Complete the path to form a closed shape
      ctx.lineTo(canvas.width, canvas.height)
      ctx.lineTo(0, canvas.height)
      ctx.closePath()
      
      // Fill with a semi-transparent gradient
      const gradient = ctx.createLinearGradient(0, canvas.height * 0.5, 0, canvas.height)
      gradient.addColorStop(0, \`\${color}99\`) // Semi-transparent at top
      gradient.addColorStop(1, \`\${color}33\`) // More transparent at bottom
      ctx.fillStyle = gradient
      ctx.fill()

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [width, height, color, speed])

  return (
    <canvas ref={canvasRef} width={width} height={height} className={className} />
  )
}`
  },

  // Add deeds-related functionality
  deeds: {
    'db/schema/deeds-schema.ts': `import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { createInsertSchema, createSelectSchema } from "drizzle-zod"
import { z } from "zod"

export const deedsTable = pgTable("deeds", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
})

// Types for usage in the app
export type SelectDeed = typeof deedsTable.$inferSelect
export type InsertDeed = typeof deedsTable.$inferInsert

// Schemas for validation
export const insertDeedSchema = createInsertSchema(deedsTable, {
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().min(1, "Description is required").max(500, "Description must be less than 500 characters"),
  location: z.string().max(100, "Location must be less than 100 characters").optional()
})

export const selectDeedSchema = createSelectSchema(deedsTable)`,

    'actions/db/deeds-actions.ts': `"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/db/db"
import { deedsTable, insertDeedSchema } from "@/db/schema"
import { eq } from "drizzle-orm"
import { ActionState } from "@/types"

export async function createDeedAction(formData: FormData): Promise<ActionState<undefined>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    // Parse and validate the form data
    const title = formData.get("title") as string
    const description = formData.get("description") as string
    const location = formData.get("location") as string | null
    const validatedFields = insertDeedSchema.safeParse({ title, description, location: location || undefined })
    if (!validatedFields.success) {
      return { isSuccess: false, message: "Invalid fields" }
    }
    // Insert the deed
    await db.insert(deedsTable).values({ userId, ...validatedFields.data })
    revalidatePath("/ripple")
    return { isSuccess: true, message: "Deed created successfully" }
  } catch (error) {
    console.error("Error creating deed:", error)
    return { isSuccess: false, message: "Failed to create deed" }
  }
}`
  }
};

// Function to backup a file
function backupFile(filePath, content) {
  const relativePath = filePath;
  const backupPath = path.join(backupDir, relativePath);
  
  // Create directory structure for backup
  const backupFileDir = path.dirname(backupPath);
  if (!isDryRun) {
    fs.mkdirSync(backupFileDir, { recursive: true });
    fs.writeFileSync(backupPath, content);
  }
  console.log(`${isDryRun ? '[DRY RUN] Would backup' : 'Backed up'}: ${filePath}`);
}
// Function to append content to a file if it doesn't already exist
function appendToFile(filePath, content) {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File doesn't exist: ${filePath} - Creating it...`);
    if (!isDryRun) {
      // Create directory if it doesn't exist
      const dir = path.dirname(fullPath);
      fs.mkdirSync(dir, { recursive: true });
      // Write the file
      fs.writeFileSync(fullPath, content);
    }
    return true;
  }
  const existingContent = fs.readFileSync(fullPath, 'utf8');
  // Check if the content is already in the file
  if (!existingContent.includes(content.trim())) {
    // Backup if needed
    if (createBackup) {
      backupFile(filePath, existingContent);
    }
    // Append the content
    if (!isDryRun) {
      fs.writeFileSync(fullPath, existingContent + '\n' + content);
      console.log(`Updated file: ${filePath}`);
    } else {
      console.log(`[DRY RUN] Would update: ${filePath}`);
    }
    return true;
  } else {
    if (isVerbose) {
      console.log(`Content already exists in: ${filePath}`);
    }
    return false;
  }
}

// Process each file group based on selection
let totalFiles = 0;
let processedFiles = 0;
console.log(`Selected group: ${selectedGroup}`);
Object.keys(fileGroups).forEach(group => {
  if (selectedGroup !== 'all' && group !== selectedGroup) {
    if (isVerbose) {
      console.log(`Skipping group: ${group}`);
    }
    return;
  }
  console.log(`Processing group: ${group}`);
  const files = fileGroups[group];
  Object.keys(files).forEach(filePath => {
    totalFiles++;
    const content = files[filePath];
    if (APPEND_FILES.includes(filePath) && shouldAppend) {
      if (appendToFile(filePath, content)) {
        processedFiles++;
      }
    } else if (MERGE_FILES.includes(filePath)) {
      // For merge files, add a warning comment
      if (populateFile(filePath, `// RIPPLE EFFECT MODIFICATIONS - MANUAL MERGE MIGHT BE NEEDED\n${content}`)) {
        processedFiles++;
      }
    } else {
      if (populateFile(filePath, content)) {
        processedFiles++;
      }
    }
  });
});
console.log(`\nProcessed ${processedFiles} of ${totalFiles} files.`);
console.log(`Finished populating files for group: ${selectedGroup}`);