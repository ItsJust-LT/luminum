import AboutHero from "@/components/about/about-hero"
import CompanyStats from "@/components/about/compant-stats"
import CompanyValues from "@/components/about/compant-values"
import OurStory from "@/components/about/our-story"
import TeamSection from "@/components/about/team-section"
import EnhancedCTASection from "@/components/home/cta-section"
import type { Metadata } from "next"


export const metadata: Metadata = {
  title: "About Us - Leading Web Design Agency in South Africa | Luminum Agency",
  description:
    "Learn about Luminum Agency, South Africa's premier web design and development company. Discover our story, meet our expert team, and see why 500+ businesses trust us with their digital transformation.",
  keywords: [
    "about Luminum Agency",
    "web design company South Africa",
    "web development team",
    "Johannesburg web agency",
    "professional web designers",
    "South African digital agency",
    "web design experts",
    "company history",
    "web development experience",
    "digital transformation specialists",
    "responsive web design team",
    "e-commerce development experts",
    "SEO specialists South Africa",
    "UI/UX design team",
    "custom website developers",
  ],
  openGraph: {
    title: "About Us - Leading Web Design Agency in South Africa | Luminum Agency",
    description:
      "Learn about Luminum Agency, South Africa's premier web design and development company. Meet our expert team and discover our story.",
    url: "https://luminum.agency/about",
    images: [
      {
        url: "/og-about.jpg",
        width: 1200,
        height: 630,
        alt: "About Luminum Agency - Web Design Team",
      },
    ],
  },
  twitter: {
    title: "About Us - Leading Web Design Agency | Luminum Agency",
    description:
      "Learn about Luminum Agency, South Africa's premier web design and development company. Meet our expert team.",
  },
  alternates: {
    canonical: "https://luminum.agency/about",
  },
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About Luminum Agency",
            description:
              "Learn about Luminum Agency, South Africa's leading web design and development company with over 10 years of experience.",
            url: "https://luminum.agency/about",
            mainEntity: {
              "@type": "Organization",
              name: "Luminum Agency",
              foundingDate: "2014",
              description:
                "Leading web design and development agency in South Africa, specializing in custom websites, e-commerce solutions, and digital marketing.",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Johannesburg",
                addressRegion: "Gauteng",
                addressCountry: "ZA",
              },
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+27689186043",
                contactType: "customer service",
                areaServed: "ZA",
                availableLanguage: "English",
              },
              founder: {
                "@type": "Person",
                name: "Luminum Agency Founders",
              },
              numberOfEmployees: {
                "@type": "QuantitativeValue",
                value: "15-25",
              },
              awards: [
                "Top Web Design Agency South Africa 2023",
                "Best E-commerce Development Company 2022",
                "Excellence in Digital Innovation 2021",
              ],
              knowsAbout: [
                "Web Design",
                "Web Development",
                "E-commerce Development",
                "SEO Optimization",
                "Digital Marketing",
                "UI/UX Design",
                "Mobile App Development",
              ],
            },
          }),
        }}
      />
      <main>
        <AboutHero />
        <OurStory/>
        <TeamSection />
        <CompanyValues />
        <CompanyStats />
        <EnhancedCTASection />
      </main>
  
    </>
  )
}
