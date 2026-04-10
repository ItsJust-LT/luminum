import { AboutView } from "@/components/about/about-view"
import type { Metadata } from "next"
import { SITE, SITE_URL } from "@/lib/site-copy"

export const metadata: Metadata = {
  title: "About Us",
  description: `${SITE.shortDescription}`,
  keywords: [
    "Luminum Agency",
    "web design South Africa",
    "web development Johannesburg",
    "digital agency Gauteng",
    "SEO South Africa",
  ],
  openGraph: {
    title: "About Luminum Agency",
    description: SITE.shortDescription,
    url: `${SITE_URL}/about`,
    siteName: SITE.name,
    locale: "en_ZA",
    type: "website",
    images: [
      {
        url: "/og-about.jpg",
        width: 1200,
        height: 630,
        alt: `About ${SITE.name}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Luminum Agency",
    description: SITE.shortDescription,
  },
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
}

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `About ${SITE.name}`,
  description: SITE.shortDescription,
  url: `${SITE_URL}/about`,
  mainEntity: {
    "@type": "Organization",
    name: SITE.name,
    url: SITE_URL,
    email: SITE.email,
    telephone: SITE.phoneE164,
    description: SITE.shortDescription,
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: "ZA",
    },
    areaServed: { "@type": "Country", name: SITE.country },
  },
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <AboutView />
    </>
  )
}
