"use client"

import { useParams } from "next/navigation"
import { orgNavPath } from "@/lib/org-nav-path"
import { useCustomDomain } from "@/lib/hooks/use-custom-domain"

/** Build org-aware paths under `/[slug]/team/...` or flat `/team/...` on custom domain. */
export function useTeamHref() {
  const params = useParams()
  const { isCustomDomain } = useCustomDomain()
  const slug = (params?.slug as string) || ""
  const teamBase = orgNavPath(slug, isCustomDomain, "team")
  return {
    slug,
    teamBase,
    href: (sub: string) => {
      const path = sub.replace(/^\//, "")
      return path ? `${teamBase}/${path}` : teamBase
    },
  }
}
