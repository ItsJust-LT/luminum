/**
 * Single source of truth for stats and contact details shown across the marketing site.
 */

export const SITE = {
  name: "Luminum Agency",
  phoneDisplay: "068 918 6043",
  phoneTel: "0689186043",
  phoneE164: "+27689186043",
  email: "contact@luminum.agency",
  city: "Johannesburg",
  region: "Gauteng",
  country: "South Africa",
  stats: {
    projectsDelivered: "200+",
    clientSatisfaction: "98%",
    yearsExperience: "15+",
    revenueImpactDisplay: "R500k+",
    clientRating: "4.9/5",
    /** Targets for animated counters (must match display strings above). */
    projectsN: 200,
    satisfactionN: 98,
    yearsN: 15,
    revenueKN: 500,
  },
  statLabels: {
    projectsDelivered: "Projects delivered",
    clientSatisfaction: "Client satisfaction",
    yearsExperience: "Years experience",
    revenueImpact: "Revenue impact",
    clientRating: "Client rating",
  },
  /** One-line positioning; reuse in meta descriptions where appropriate. */
  shortDescription:
    "Luminum Agency builds high-performing websites and digital experiences for South African businesses — strategy, design, development, and growth.",
  missionLine:
    "We combine technical excellence with thoughtful design so your brand converts visitors into customers.",
} as const

export const SITE_URL = "https://luminum.agency"
