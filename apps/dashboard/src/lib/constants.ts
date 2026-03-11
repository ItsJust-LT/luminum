/**
 * Application-wide constants and product wording.
 * Use these for metadata, titles, and user-facing copy to keep branding consistent.
 */

export const APP = {
  name: "Luminum",
  nameWithSuffix: "Luminum Agency",
  tagline: "A modern Progressive Web Application built with Next.js",
  description: "Manage your organizations, analytics, and team in one place.",
} as const;

export const METADATA = {
  defaultTitle: `${APP.nameWithSuffix} - Dashboard`,
  titleTemplate: `%s | ${APP.name}`,
  openGraphTitle: `${APP.name} - Progressive Web App`,
  siteName: APP.name,
} as const;
