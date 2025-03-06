"use client"

import { useEffect, useRef } from "react"
import { MapLocation } from "@/types/ripple-types"

interface WaterAnimationProps {
  locations?: MapLocation[]
  width?: number
  height?: number
  color?: string
}

export default function WaterAnimation({
  locations = [],
  width = 800,
  height = 400,
  color = "#1976d2"
}: WaterAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions to match container or use provided dimensions
    const resizeCanvas = () => {
      const container = canvas.parentElement
      if (container) {
        canvas.width = container.clientWidth || width
        canvas.height = container.clientHeight || height
      } else {
        canvas.width = width
        canvas.height = height
      }
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Create ripples for each location
    const ripples: Array<{
      x: number
      y: number
      radius: number
      maxRadius: number
      opacity: number
      speed: number
      title: string
    }> = []

    // Map coordinates to canvas coordinates
    locations.forEach(location => {
      // Simple mapping from lat/long to x/y
      const x = ((location.longitude + 180) / 360) * canvas.width
      const y = ((90 - location.latitude) / 180) * canvas.height

      ripples.push({
        x,
        y,
        radius: 0,
        maxRadius: 20 + location.impact * 5, // Bigger impact = bigger ripple
        opacity: 0.7,
        speed: 0.5 + Math.random() * 0.5,
        title: location.title
      })
    })

    // If no locations provided, add some default ripples
    if (ripples.length === 0) {
      for (let i = 0; i < 5; i++) {
        ripples.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: 0,
          maxRadius: 40 + Math.random() * 30,
          opacity: 0.7,
          speed: 0.5 + Math.random() * 0.5,
          title: "Ripple " + (i + 1)
        })
      }
    }

    // Animation function
    const animate = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw water background
      ctx.fillStyle = "#e0f7fa"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw simple map outlines
      ctx.strokeStyle = "#90caf9"
      ctx.lineWidth = 2
      ctx.beginPath()
      // Simplified world outlines
      ctx.moveTo(canvas.width * 0.1, canvas.height * 0.3)
      ctx.lineTo(canvas.width * 0.3, canvas.height * 0.3)
      ctx.lineTo(canvas.width * 0.25, canvas.height * 0.6)
      ctx.lineTo(canvas.width * 0.15, canvas.height * 0.5)
      ctx.closePath()

      ctx.moveTo(canvas.width * 0.45, canvas.height * 0.2)
      ctx.lineTo(canvas.width * 0.55, canvas.height * 0.2)
      ctx.lineTo(canvas.width * 0.5, canvas.height * 0.7)
      ctx.lineTo(canvas.width * 0.45, canvas.height * 0.5)
      ctx.closePath()

      ctx.moveTo(canvas.width * 0.6, canvas.height * 0.3)
      ctx.lineTo(canvas.width * 0.8, canvas.height * 0.3)
      ctx.lineTo(canvas.width * 0.75, canvas.height * 0.6)
      ctx.lineTo(canvas.width * 0.65, canvas.height * 0.5)
      ctx.closePath()

      ctx.stroke()

      // Draw and update ripples using the passed color
      ripples.forEach(ripple => {
        // Draw ripple
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `${color}${Math.floor(ripple.opacity * 255)
          .toString(16)
          .padStart(2, "0")}`
        ctx.lineWidth = 2
        ctx.stroke()

        // Draw additional ripples
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, ripple.radius * 0.7, 0, Math.PI * 2)
        ctx.strokeStyle = `${color}${Math.floor(ripple.opacity * 0.8 * 255)
          .toString(16)
          .padStart(2, "0")}`
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, ripple.radius * 0.4, 0, Math.PI * 2)
        ctx.strokeStyle = `${color}${Math.floor(ripple.opacity * 0.6 * 255)
          .toString(16)
          .padStart(2, "0")}`
        ctx.lineWidth = 1
        ctx.stroke()

        // Draw center point
        ctx.beginPath()
        ctx.arc(ripple.x, ripple.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()

        // Draw location name
        ctx.font = "10px Arial"
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
        ctx.textAlign = "center"
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
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [locations, width, height, color])

  return (
    <canvas
      ref={canvasRef}
      className="size-full"
      style={{ display: "block" }}
    />
  )
}
