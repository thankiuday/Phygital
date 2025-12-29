/**
 * Fireworks Animation Component
 * Creates firework bursts for Diwali theme
 */

import React, { useEffect, useRef } from 'react'

const Fireworks = ({ density = 1, speed = 1, containerRef }) => {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const fireworksRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const container = containerRef?.current || document.body
    const rect = container.getBoundingClientRect()

    canvas.width = rect.width
    canvas.height = rect.height

    // Firework particle
    class Particle {
      constructor(x, y, color) {
        this.x = x
        this.y = y
        this.color = color
        this.vx = (Math.random() - 0.5) * 8
        this.vy = (Math.random() - 0.5) * 8
        this.life = 1
        this.decay = Math.random() * 0.02 + 0.01
        this.size = Math.random() * 3 + 1
      }

      update() {
        this.x += this.vx * speed
        this.y += this.vy * speed
        this.vy += 0.1 * speed // Gravity
        this.life -= this.decay
      }

      draw() {
        ctx.globalAlpha = this.life
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }

    // Firework burst
    class Firework {
      constructor() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height * 0.3
        this.particles = []
        this.exploded = false
        this.vy = -Math.random() * 3 - 2
        this.vx = (Math.random() - 0.5) * 2
        this.color = ['#F59E0B', '#F97316', '#FCD34D', '#FBBF24'][Math.floor(Math.random() * 4)]
      }

      update() {
        if (!this.exploded) {
          this.y += this.vy * speed
          this.x += this.vx * speed

          if (this.y < canvas.height * 0.2 || Math.random() < 0.02) {
            this.explode()
          }
        } else {
          this.particles.forEach((particle, index) => {
            particle.update()
            if (particle.life <= 0) {
              this.particles.splice(index, 1)
            }
          })
        }
      }

      explode() {
        this.exploded = true
        const numParticles = Math.floor(30 * density)
        for (let i = 0; i < numParticles; i++) {
          this.particles.push(new Particle(this.x, this.y, this.color))
        }
      }

      draw() {
        if (!this.exploded) {
          ctx.fillStyle = this.color
          ctx.beginPath()
          ctx.arc(this.x, this.y, 3, 0, Math.PI * 2)
          ctx.fill()
        } else {
          this.particles.forEach(particle => particle.draw())
        }
      }

      isDead() {
        return this.exploded && this.particles.length === 0
      }
    }

    // Create fireworks
    const createFirework = () => {
      fireworksRef.current.push(new Firework())
    }

    // Initial fireworks
    const numFireworks = Math.floor(3 * density)
    for (let i = 0; i < numFireworks; i++) {
      setTimeout(() => createFirework(), i * 2000)
    }

    // Spawn new fireworks periodically
    const spawnInterval = setInterval(() => {
      if (fireworksRef.current.length < 5 * density) {
        createFirework()
      }
    }, 3000 / density)

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      fireworksRef.current.forEach((firework, index) => {
        firework.update()
        firework.draw()

        if (firework.isDead()) {
          fireworksRef.current.splice(index, 1)
        }
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
      clearInterval(spawnInterval)
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

export default Fireworks






