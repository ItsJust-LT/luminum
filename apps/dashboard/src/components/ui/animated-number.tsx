"use client"

import { useEffect, useState, useRef } from "react"

/** Ease-out cubic: fast start, smooth deceleration at end */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

export interface AnimatedNumberProps {
  value: number
  duration?: number
  /** When target changes mid-animation, use this shorter duration so the number can "chase" the value. Default 280ms. */
  chaseDuration?: number
  /** Format the displayed number (e.g. toLocaleString, or formatDuration). Default: round + toLocaleString */
  format?: (n: number) => string
  className?: string
}

/**
 * Animates a number toward the target value. If the target keeps changing (e.g. live count),
 * animates from the current displayed value to the new target with a shorter "chase" duration
 * so the animation stays smooth and responsive.
 */
export function AnimatedNumber({
  value,
  duration = 700,
  chaseDuration = 280,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value)
  /** Always holds the current numeric value on screen (so we can animate from here when target changes). */
  const currentRef = useRef(value)
  const rafRef = useRef<number>()
  const startRef = useRef<number>(0)
  const fromRef = useRef(value)
  const targetRef = useRef(value)
  const isChasingRef = useRef(false)

  useEffect(() => {
    const to = value
    const from = currentRef.current

    if (from === to) {
      targetRef.current = to
      currentRef.current = to
      setDisplayValue(to)
      return
    }

    const wasAnimating = rafRef.current != null
    if (wasAnimating) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = undefined
    }

    fromRef.current = from
    targetRef.current = to
    startRef.current = performance.now()
    isChasingRef.current = wasAnimating
    const animDuration = wasAnimating ? chaseDuration : duration

    const tick = (now: number) => {
      const elapsed = now - startRef.current
      const t = Math.min(elapsed / animDuration, 1)
      const eased = easeOutCubic(t)
      const current = fromRef.current + (targetRef.current - fromRef.current) * eased
      currentRef.current = current
      setDisplayValue(current)

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = undefined
        currentRef.current = targetRef.current
        setDisplayValue(targetRef.current)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, chaseDuration])

  return <span className={className}>{format(displayValue)}</span>
}
