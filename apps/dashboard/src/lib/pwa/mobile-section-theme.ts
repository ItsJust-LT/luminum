import { orgNavPath } from '@/lib/org-nav-path'

const SECTIONS = [
  'dashboard',
  'analytics',
  'audits',
  'forms',
  'blogs',
  'emails',
  'whatsapp',
  'invoices',
  'team',
  'settings',
  'billing',
  'reports',
  'support',
] as const

export type MobileAppSection = (typeof SECTIONS)[number] | 'default'

export interface MobileSectionChrome {
  section: MobileAppSection
  /** Header strip (solid surface, no hard divider) */
  headerSurface: string
  /** Main scroll area background */
  mainSurface: string
}

const CHROME: Record<MobileAppSection, MobileSectionChrome> = {
  dashboard: {
    section: 'dashboard',
    headerSurface:
      'bg-gradient-to-r from-violet-500/[0.1] via-background/50 to-background/35 dark:from-violet-400/[0.08]',
    mainSurface: 'bg-gradient-to-b from-violet-500/[0.05] via-background/85 to-background/90',
  },
  analytics: {
    section: 'analytics',
    headerSurface:
      'bg-gradient-to-r from-cyan-500/[0.09] via-background/50 to-background/35 dark:from-cyan-400/[0.07]',
    mainSurface: 'bg-gradient-to-b from-cyan-500/[0.05] via-background/85 to-background/90',
  },
  audits: {
    section: 'audits',
    headerSurface:
      'bg-gradient-to-r from-amber-500/[0.1] via-background/50 to-background/35 dark:from-amber-400/[0.07]',
    mainSurface: 'bg-gradient-to-b from-amber-500/[0.05] via-background/85 to-background/90',
  },
  forms: {
    section: 'forms',
    headerSurface:
      'bg-gradient-to-r from-blue-500/[0.09] via-background/50 to-background/35 dark:from-blue-400/[0.07]',
    mainSurface: 'bg-gradient-to-b from-blue-500/[0.04] via-background/85 to-background/90',
  },
  blogs: {
    section: 'blogs',
    headerSurface:
      'bg-gradient-to-r from-orange-500/[0.09] via-background/50 to-background/35 dark:from-orange-400/[0.07]',
    mainSurface: 'bg-gradient-to-b from-orange-500/[0.04] via-background/85 to-background/90',
  },
  emails: {
    section: 'emails',
    headerSurface:
      'bg-gradient-to-r from-sky-500/[0.09] via-background/50 to-background/35 dark:from-sky-400/[0.07]',
    mainSurface: 'bg-gradient-to-b from-sky-500/[0.04] via-background/85 to-background/90',
  },
  whatsapp: {
    section: 'whatsapp',
    headerSurface:
      'bg-gradient-to-r from-emerald-500/[0.1] via-background/50 to-background/40 dark:from-emerald-400/[0.08]',
    mainSurface: 'bg-background/90',
  },
  invoices: {
    section: 'invoices',
    headerSurface:
      'bg-gradient-to-r from-teal-500/[0.09] via-background/50 to-background/35 dark:from-teal-400/[0.07]',
    mainSurface: 'bg-gradient-to-b from-teal-500/[0.04] via-background/85 to-background/90',
  },
  team: {
    section: 'team',
    headerSurface:
      'bg-gradient-to-r from-indigo-500/[0.09] via-background/50 to-background/35 dark:from-indigo-400/[0.07]',
    mainSurface: 'bg-gradient-to-b from-indigo-500/[0.04] via-background/85 to-background/90',
  },
  settings: {
    section: 'settings',
    headerSurface:
      'bg-gradient-to-r from-slate-500/[0.08] via-background/50 to-background/35 dark:from-slate-400/[0.06]',
    mainSurface: 'bg-gradient-to-b from-slate-500/[0.03] via-background/85 to-background/90',
  },
  billing: {
    section: 'billing',
    headerSurface:
      'bg-gradient-to-r from-rose-500/[0.09] via-background/50 to-background/35 dark:from-rose-400/[0.07]',
    mainSurface: 'bg-gradient-to-b from-rose-500/[0.04] via-background/85 to-background/90',
  },
  reports: {
    section: 'reports',
    headerSurface:
      'bg-gradient-to-r from-fuchsia-500/[0.08] via-background/50 to-background/35 dark:from-fuchsia-400/[0.06]',
    mainSurface: 'bg-gradient-to-b from-fuchsia-500/[0.04] via-background/85 to-background/90',
  },
  support: {
    section: 'support',
    headerSurface:
      'bg-gradient-to-r from-pink-500/[0.09] via-background/50 to-background/35 dark:from-pink-400/[0.07]',
    mainSurface: 'bg-gradient-to-b from-pink-500/[0.04] via-background/85 to-background/90',
  },
  default: {
    section: 'default',
    headerSurface: 'bg-background/45',
    mainSurface: 'bg-background/80',
  },
}

export function resolveMobileSection(
  pathname: string,
  slug: string,
  flatRoutes: boolean,
): MobileAppSection {
  const byLength = [...SECTIONS].sort(
    (a, b) => orgNavPath(slug, flatRoutes, b).length - orgNavPath(slug, flatRoutes, a).length,
  )
  for (const s of byLength) {
    const p = orgNavPath(slug, flatRoutes, s)
    if (pathname === p || pathname.startsWith(`${p}/`)) return s
  }
  return 'default'
}

export function getMobileSectionChrome(
  pathname: string,
  slug: string,
  flatRoutes: boolean,
): MobileSectionChrome {
  const section = resolveMobileSection(pathname, slug, flatRoutes)
  return CHROME[section]
}
