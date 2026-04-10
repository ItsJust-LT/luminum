/** Shared motion presets — use with Framer Motion / Motion. */

export const springSnappy = { type: "spring" as const, stiffness: 420, damping: 34, mass: 0.8 }

export const springSoft = { type: "spring" as const, stiffness: 280, damping: 28 }

export const easeOut = [0.22, 1, 0.36, 1] as const

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.28, ease: easeOut },
}
