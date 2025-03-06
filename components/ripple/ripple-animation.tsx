"use client"

import { useEffect, useRef } from "react"

interface RippleAnimationProps {
  size?: number
  color?: string
  speed?: number
  className?: string
}

export default function RippleAnimation({
  size = 200,
  color = "#2563eb",
  speed = 1.5,
  className = ""
}: RippleAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
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
        ctx.strokeStyle = `${color}${Math.floor(ripple.opacity * 255)
          .toString(16)
          .padStart(2, "0")}`
        ctx.lineWidth = 2
        ctx.stroke()

        // Update ripple
        ripple.radius += speed
        ripple.opacity -= 0.002 * speed

        // Reset ripple when it gets too big or too transparent
        if (ripple.radius > size / 2 || ripple.opacity <= 0) {
          // Stagger the ripples by delaying their reset
          if (
            index === 0 ||
            (index === 1 && ripples[0].radius > 20) ||
            (index === 2 && ripples[1].radius > 20)
          ) {
            ripple.radius = 0
            ripple.opacity = 0.4 - index * 0.1
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
    <canvas ref={canvasRef} width={size} height={size} className={className} />
  )
}
