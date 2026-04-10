"use client"

import { useEffect, useState } from "react"

export type ShortcutKeyLabels = { mod: string; shift: string; alt: string }

/** OS-aware labels for menu shortcut hints (hydration-safe default, then client refines). */
export function useShortcutKeyLabels(): ShortcutKeyLabels {
  const [labels, setLabels] = useState<ShortcutKeyLabels>({
    mod: "⌘",
    shift: "⇧",
    alt: "⌥",
  })

  useEffect(() => {
    const mac =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPod|iPad/i.test(navigator.platform)
    setLabels({
      mod: mac ? "⌘" : "Ctrl",
      shift: mac ? "⇧" : "Shift",
      alt: mac ? "⌥" : "Alt",
    })
  }, [])

  return labels
}
