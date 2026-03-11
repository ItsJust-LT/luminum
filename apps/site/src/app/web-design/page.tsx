import type { Metadata } from "next"
import { FloatingWhatsApp } from "@/components/lead-pages/web-design/floating-whatsapp"
import { WebDesignHero } from "@/components/lead-pages/web-design/web-design-hero"
import { BenefitsGrid } from "@/components/lead-pages/web-design/benefits-grid"
import { PaymentPlans } from "@/components/lead-pages/web-design/payment-plans"
import { ProcessSection } from "@/components/lead-pages/web-design/process-section"
import { LeadForm } from "@/components/lead-pages/web-design/lead-form"
import { WebDesignFAQ } from "@/components/lead-pages/web-design/web-design-faq"
import { FinalCTA } from "@/components/lead-pages/web-design/final-cta"

export const metadata: Metadata = {
  title: "Professional Website Design from R2,999 | Luminum Agency - Custom Development",
  description:
    "Luminum Agency creates custom websites with full source code ownership. Professional development, mobile-optimized, with flexible payment plans. Get your free quote today!",
  keywords:
    "Luminum Agency, custom website development, professional web design South Africa, website source code, business website, mobile website development, payment plans",
  openGraph: {
    title: "Professional Website Design from R2,999 | Luminum Agency - Custom Development",
    description:
      "Luminum Agency creates custom websites with full source code ownership. Professional development with flexible payment plans from R399/month.",
    type: "website",
    locale: "en_ZA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Professional Website Design | Luminum Agency",
    description:
      "Custom websites with full source code ownership. Professional development with flexible payment plans from R399/month.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/web-design",
  },
}

export default function WebDesignPage() {
  return (
    <main className="min-h-screen bg-white">
      <WebDesignHero />
      <BenefitsGrid />
      <PaymentPlans />
      <ProcessSection />
      <LeadForm />
      <WebDesignFAQ />
      <FinalCTA />
      <FloatingWhatsApp />
    </main>
  )
}
