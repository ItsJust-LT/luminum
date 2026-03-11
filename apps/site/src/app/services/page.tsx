import Header from "@/components/header"
import ServicesHero from "@/components/services/services-hero"
import ServicesGrid from "@/components/services/services-grid"
import ServicesPricing from "@/components/services/services-pricing"
import ServicesProcess from "@/components/services/services-process"
import CTASection from "@/components/home/cta-section"
import Footer from "@/components/footer"
import type { Metadata } from "next"


export const metadata: Metadata = {
  title: "Web Design & Development Services - Affordable Packages | Luminum Agency",
  description:
    "Comprehensive web design and development services in South Africa. Custom websites from R2,999, e-commerce solutions, SEO optimization, and digital marketing. View our affordable packages and get started today!",
  keywords: [
    "web design services",
    "web development packages",
    "affordable web design",
    "custom website development",
    "e-commerce development services",
    "responsive web design",
    "SEO optimization services",
    "digital marketing services",
    "website maintenance",
    "WordPress development",
    "React development",
    "UI/UX design services",
    "mobile app development",
    "website redesign",
    "professional web services",
    "business website packages",
    "online store development",
    "web design pricing",
    "website development cost",
    "South Africa web services",
  ],
  openGraph: {
    title: "Web Design & Development Services - Affordable Packages | Luminum Agency",
    description:
      "Comprehensive web design and development services. Custom websites from R2,999, e-commerce solutions, and SEO optimization packages.",
    url: "https://luminum.agency/services",
    images: [
      {
        url: "/og-services.jpg",
        width: 1200,
        height: 630,
        alt: "Luminum Agency Web Design Services",
      },
    ],
  },
  twitter: {
    title: "Web Design & Development Services | Luminum Agency",
    description:
      "Comprehensive web design and development services. Custom websites, e-commerce solutions, and SEO optimization packages.",
  },
  alternates: {
    canonical: "https://luminum.agency/services",
  },
}

export default function ServicesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Web Design and Development Services",
            description:
              "Professional web design and development services including custom websites, e-commerce solutions, and SEO optimization.",
            provider: {
              "@type": "Organization",
              name: "Luminum Agency",
              url: "https://luminum.agency",
            },
            areaServed: {
              "@type": "Country",
              name: "South Africa",
            },
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: "Web Design Services",
              itemListElement: [
                {
                  "@type": "Offer",
                  itemOffered: {
                    "@type": "Service",
                    name: "Starter Web Design Package",
                    description: "Perfect for small businesses and startups",
                  },
                  price: "2999",
                  priceCurrency: "ZAR",
                  availability: "https://schema.org/InStock",
                },
                {
                  "@type": "Offer",
                  itemOffered: {
                    "@type": "Service",
                    name: "Professional Web Development Package",
                    description: "Comprehensive solution for growing businesses",
                  },
                  price: "6999",
                  priceCurrency: "ZAR",
                  availability: "https://schema.org/InStock",
                },
                {
                  "@type": "Offer",
                  itemOffered: {
                    "@type": "Service",
                    name: "Enterprise Web Solutions",
                    description: "Advanced solutions for large businesses",
                  },
                  price: "14999",
                  priceCurrency: "ZAR",
                  availability: "https://schema.org/InStock",
                },
              ],
            },
          }),
        }}
      />
      <main>
      <ServicesHero />
      <ServicesGrid />
      <ServicesProcess />
      <ServicesPricing />
      <CTASection />
      </main>
    </>
  )
}
