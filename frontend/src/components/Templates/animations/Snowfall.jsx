/**
 * Snowfall Animation Component
 * Creates falling snow effect for Christmas theme
 */

import React, { useEffect, useRef } from 'react'

const Snowfall = ({ density = 1, speed = 1, containerRef }) => {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const snowflakesRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const container = containerRef?.current || document.body
    const rect = container.getBoundingClientRect()

    canvas.width = rect.width
    canvas.height = rect.height

    // Create snowflakes
    const createSnowflake = () => {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 3 + 1,
        speed: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.5,
        sway: Math.random() * 0.5 + 0.5
      }
    }

    const numSnowflakes = Math.floor(50 * density)
    snowflakesRef.current = Array.from({ length: numSnowflakes }, createSnowflake)

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'

      snowflakesRef.current.forEach((flake, index) => {
        // Update position
        flake.y += flake.speed * speed
        flake.x += Math.sin(flake.y * 0.01) * flake.sway

        // Reset if off screen
        if (flake.y > canvas.height) {
          flake.y = -10
          flake.x = Math.random() * canvas.width
        }

        // Wrap horizontally
        if (flake.x < 0) flake.x = canvas.width
        if (flake.x > canvas.width) flake.x = 0

        // Draw snowflake
        ctx.beginPath()
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2)
        ctx.globalAlpha = flake.opacity
        ctx.fill()
        ctx.globalAlpha = 1
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

export default Snowfall








