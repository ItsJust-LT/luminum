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
  /** Header strip + border */
  headerSurface: string
  /** Main scroll area background */
  mainSurface: string
}

const CHROME: Record<MobileAppSection, MobileSectionChrome> = {
  dashboard: {
    section: 'dashboard',
    headerSurface:
      'border-b border-violet-500/15 bg-gradient-to-r from-violet-500/[0.14] via-background to-background dark:from-violet-400/[0.12]',
    mainSurface: 'bg-gradient-to-b from-violet-500/[0.07] via-background/80 to-background',
  },
  analytics: {
    section: 'analytics',
    headerSurface:
      'border-b border-cyan-500/15 bg-gradient-to-r from-cyan-500/[0.14] via-background to-background dark:from-cyan-400/[0.1]',
    mainSurface: 'bg-gradient-to-b from-cyan-500/[0.07] via-background/80 to-background',
  },
  audits: {
    section: 'audits',
    headerSurface:
      'border-b border-amber-500/15 bg-gradient-to-r from-amber-500/[0.16] via-background to-background dark:from-amber-400/[0.1]',
    mainSurface: 'bg-gradient-to-b from-amber-500/[0.08] via-background/80 to-background',
  },
  forms: {
    section: 'forms',
    headerSurface:
      'border-b border-blue-500/15 bg-gradient-to-r from-blue-500/[0.14] via-background to-background dark:from-blue-400/[0.1]',
    mainSurface: 'bg-gradient-to-b from-blue-500/[0.07] via-background/80 to-background',
  },
  blogs: {
    section: 'blogs',
    headerSurface:
      'border-b border-orange-500/15 bg-gradient-to-r from-orange-500/[0.14] via-background to-background dark:from-orange-400/[0.1]',
    mainSurface: 'bg-gradient-to-b from-orange-500/[0.07] via-background/80 to-background',
  },
  emails: {
    section: 'emails',
    headerSurface:
      'border-b border-sky-500/15 bg-gradient-to-r from-sky-500/[0.14] via-background to-background dark:from-sky-400/[0.1]',
    mainSurface: 'bg-gradient-to-b from-sky-500/[0.07] via-background/80 to-background',
  },
  whatsapp: {
    section: 'whatsapp',
    headerSurface:
      'border-b border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.14] via-background to-background dark:from-emerald-400/[0.1]',
    mainSurface: 'bg-background',
  },
  invoices: {
    section: 'invoices',
    headerSurface:
      'border-b border-teal-500/15 bg-gradient-to-r from-teal-500/[0.14] via-background to-background dark:from-teal-400/[0.1]',
    mainSurface: 'bg-gradient-to-b from-teal-500/[0.07] via-background/80 to-background',
  },
  team: {
    section: 'team',
    headerSurface:
      'border-b border-indigo-500/15 bg-gradient-to-r from-indigo-500/[0.14] via-background to-background dark:from-indigo-400/[0.1]',
    mainSurface: 'bg-gradient-to-b from-indigo-500/[0.07] via-background/80 to-background',
  },
  settings: {
    section: 'settings',
    headerSurface:
      'border-b border-slate-500/15 bg-gradient-to-r from-slate-500/[0.12] via-background to-background dark:from-slate-400/[0.08]',
    mainSurface: 'bg-gradient-to-b from-slate-500/[0.05] via-background/80 to-background',
  },
  billing: {
    section: 'billing',
    headerSurface:
      'border-b border-rose-500/15 bg-gradient-to-r from-rose-500/[0.14] via-background to-background dark:from-rose-400/[0.1]',
    mainSurface: 'bg-gradient-to-b from-rose-500/[0.07] via-background/80 to-background',
  },
  reports: {
    section: 'reports',
    headerSurface:
      'border-b border-fuchsia-500/15 bg-gradient-to-r from-fuchsia-500/[0.12] via-background to-background dark:from-fuchsia-400/[0.08]',
    mainSurface: 'bg-gradient-to-b from-fuchsia-500/[0.06] via-background/80 to-background',
  },
  support: {
    section: 'support',
    headerSurface:
      'border-b border-pink-500/15 bg-gradient-to-r from-pink-500/[0.14] via-background to-background dark:from-pink-400/[0.1]',
    mainSurface: 'bg-gradient-to-b from-pink-500/[0.07] via-background/80 to-background',
  },
  default: {
    section: 'default',
    headerSurface: 'border-b border-border/40 bg-background/95',
    mainSurface: 'bg-background/50',
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
