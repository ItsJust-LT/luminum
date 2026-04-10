/** Easing compatible with Framer Motion `ease` (cubic-bezier tuple). */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

export const STAGGER_CHILDREN = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
} as const

export const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE_OUT },
  },
} as const

export function fadeUpReduce(reduceMotion: boolean | null) {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0 } },
    } as const
  }
  return FADE_UP
}

export function staggerReduce(reduceMotion: boolean | null) {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0 } },
    } as const
  }
  return STAGGER_CHILDREN
}
