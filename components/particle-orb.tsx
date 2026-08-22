"use client"

import { useRef, useEffect, useState } from "react"

export function ParticleOrb() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !mounted) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const size = 192
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    interface Dot {
      x: number
      y: number
      z: number
      size: number
      phase: number
    }

    // Golden angle distribution
    const dots: Dot[] = []
    const dotCount = 600
    const phi = Math.PI * (3 - Math.sqrt(5))
    const radius = 70

    for (let i = 0; i < dotCount; i++) {
      const y = 1 - (i / (dotCount - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const theta = phi * i
      dots.push({
        x: Math.cos(theta) * r * radius,
        y: y * radius,
        z: Math.sin(theta) * r * radius,
        size: 0.8 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
      })
    }

    let raf: number
    const center = size / 2

    function draw(time: number) {
      if (!ctx) return
      ctx.clearRect(0, 0, size, size)

      const t = time * 0.001
      const cosY = Math.cos(t * 0.08)
      const sinY = Math.sin(t * 0.08)
      const cosX = Math.cos(t * 0.05)
      const sinX = Math.sin(t * 0.05)

      // Sort by z for depth
      const sorted = dots.map((d) => {
        // Rotate Y
        let x = d.x * cosY - d.z * sinY
        let z = d.x * sinY + d.z * cosY
        // Rotate X
        let y = d.y * cosX - z * sinX
        z = d.y * sinX + z * cosX
        return { ...d, rx: x, ry: y, rz: z }
      })
      sorted.sort((a, b) => a.rz - b.rz)

      for (const dot of sorted) {
        const depth = (dot.rz + radius) / (radius * 2)
        const alpha = 0.2 + depth * 0.7
        const pulse = 1 + Math.sin(t * 2 + dot.phase) * 0.2
        const s = dot.size * (0.5 + depth * 0.5) * pulse

        ctx.beginPath()
        ctx.arc(center + dot.rx, center + dot.ry, s, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      }

      // Core glow
      const corePulse = 1 + Math.sin(t * 1.5) * 0.03
      const coreGrad = ctx.createRadialGradient(
        center,
        center,
        0,
        center,
        center,
        15 * corePulse
      )
      coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)")
      coreGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.3)")
      coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)")
      ctx.beginPath()
      ctx.arc(center, center, 15 * corePulse, 0, Math.PI * 2)
      ctx.fillStyle = coreGrad
      ctx.fill()

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [mounted])

  return (
    <div className="w-48 h-48 relative">
      {/* Outer glow effect */}
      <div className="absolute inset-[-30%] rounded-full blur-3xl" style={{
        background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 40%, transparent 70%)"
      }} />
      <canvas
        ref={canvasRef}
        style={{ width: 192, height: 192, background: "transparent" }}
      />
    </div>
  )
}
