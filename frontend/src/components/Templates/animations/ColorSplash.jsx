/**
 * Color Splash Animation Component
 * Creates colorful particle effects for Holi theme
 */

import React, { useEffect, useRef } from 'react'

const ColorSplash = ({ density = 1, speed = 1, containerRef }) => {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const particlesRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const container = containerRef?.current || document.body
    const rect = container.getBoundingClientRect()

    canvas.width = rect.width
    canvas.height = rect.height

    const colors = ['#EC4899', '#3B82F6', '#10B981', '#FCD34D', '#A855F7', '#F97316']

    // Color particle
    class ColorParticle {
      constructor() {
        this.reset()
        this.y = Math.random() * canvas.height
      }

      reset() {
        this.x = Math.random() * canvas.width
        this.y = -10
        this.vx = (Math.random() - 0.5) * 2
        this.vy = Math.random() * 3 + 2
        this.color = colors[Math.floor(Math.random() * colors.length)]
        this.size = Math.random() * 8 + 4
        this.life = 1
        this.decay = Math.random() * 0.01 + 0.005
        this.rotation = Math.random() * Math.PI * 2
        this.rotationSpeed = (Math.random() - 0.5) * 0.1
      }

      update() {
        this.x += this.vx * speed
        this.y += this.vy * speed
        this.rotation += this.rotationSpeed
        this.life -= this.decay

        // Add some sway
        this.vx += Math.sin(this.y * 0.01) * 0.1

        if (this.life <= 0 || this.y > canvas.height + 20) {
          this.reset()
        }
      }

      draw() {
        ctx.save()
        ctx.globalAlpha = this.life
        ctx.translate(this.x, this.y)
        ctx.rotate(this.rotation)
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(0, 0, this.size, 0, Math.PI * 2)
        ctx.fill()
        
        // Add glow effect
        ctx.shadowBlur = 10
        ctx.shadowColor = this.color
        ctx.fill()
        ctx.restore()
      }
    }

    // Create particles
    const numParticles = Math.floor(60 * density)
    particlesRef.current = Array.from({ length: numParticles }, () => new ColorParticle())

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach(particle => {
        particle.update()
        particle.draw()
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    const handleResize = () => {
      const newRect = container.getBoundingClientRect()
      canvas.width = newRect.width
      canvas.height = newRect.height
    }

    window.addEventListener('resize', handleResize)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      window.removeEventListener('resize', handleResize)
    }
  }, [density, speed, containerRef])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}

export default ColorSplash








