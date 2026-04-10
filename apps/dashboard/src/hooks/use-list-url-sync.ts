"use client"

import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { mergeSearchParams } from "@/lib/url-state/list-query"

export function useReplaceListUrlParams() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  return useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const merged = mergeSearchParams(sp.toString(), updates)
      router.replace(merged ? `${pathname}?${merged}` : pathname, { scroll: false })
    },
    [pathname, router, sp]
  )
}
