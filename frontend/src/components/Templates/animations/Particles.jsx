/**
 * Generic Particles Animation Component
 * Creates generic particle effects for various themes
 */

import React, { useEffect, useRef } from 'react'

const Particles = ({ density = 1, speed = 1, color = '#8B5CF6', containerRef }) => {
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

    // Particle class
    class Particle {
      constructor() {
        this.reset()
      }

      reset() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.vx = (Math.random() - 0.5) * 0.5
        this.vy = (Math.random() - 0.5) * 0.5
        this.size = Math.random() * 2 + 1
        this.opacity = Math.random() * 0.5 + 0.3
      }

      update() {
        this.x += this.vx * speed
        this.y += this.vy * speed

        // Wrap around edges
        if (this.x < 0) this.x = canvas.width
        if (this.x > canvas.width) this.x = 0
        if (this.y < 0) this.y = canvas.height
        if (this.y > canvas.height) this.y = 0
      }

      draw() {
        ctx.globalAlpha = this.opacity
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    // Create particles
    const numParticles = Math.floor(30 * density)
    particlesRef.current = Array.from({ length: numParticles }, () => new Particle())

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

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
  }, [density, speed, color, containerRef])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    />
  )
}

export default Particles








