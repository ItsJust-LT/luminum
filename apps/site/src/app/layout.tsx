import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Poppins } from "next/font/google"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { LuminumAnalytics } from "@/components/luminum-analytics"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
})

const siteUrl = "https://luminum.agency"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Luminum Agency — Web Design & Development in South Africa",
    template: "%s | Luminum Agency",
  },
  description:
    "Transform your business with professional web development, custom design, and digital solutions. Expert team delivering modern, responsive websites that drive results.",
  keywords:
    "web development, web design, digital agency, custom websites, responsive design, SEO optimization, e-commerce development",
  authors: [{ name: "Luminum Agency" }],
  creator: "Luminum Agency",
  publisher: "Luminum Agency",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Luminum Agency - Professional Web Development & Design Services",
    description:
      "Transform your business with professional web development, custom design, and digital solutions. Expert team delivering modern, responsive websites that drive results.",
    url: "https://luminum.agency",
    siteName: "Luminum Agency",
    locale: "en_ZA",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Luminum Agency - Professional Web Development Services",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Luminum Agency - Professional Web Development & Design Services",
    description:
      "Transform your business with professional web development, custom design, and digital solutions. Expert team delivering modern, responsive websites that drive results.",
    images: ["/og-image.jpg"],
    creator: "@luminum_agency",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0B22E1" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1b4b" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
}

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Luminum Agency",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  description:
    "Professional web design and development agency in South Africa. Custom websites, SEO, e-commerce, and digital marketing.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Johannesburg",
    addressRegion: "Gauteng",
    addressCountry: "ZA",
  },
  sameAs: ["https://instagram.com/luminum_agency", "https://x.com/luminum_agency"],
}

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Luminum Agency",
  url: siteUrl,
  publisher: { "@type": "Organization", name: "Luminum Agency" },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en-ZA" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, websiteJsonLd]),
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${poppins.variable} min-h-dvh bg-background font-sans antialiased`}
      >
        <LuminumAnalytics
          websiteId={process.env.NEXT_PUBLIC_LUMINUM_WEBSITE_ID}
          analyticsBaseUrl={process.env.NEXT_PUBLIC_LUMINUM_ANALYTICS_URL}
        />
        <a href="#main-content" className="sr-only-focusable">
          Skip to main content
        </a>
        <Header />
        <div className="flex min-h-screen flex-col">
          <main id="main-content" className="flex-1 outline-none" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
