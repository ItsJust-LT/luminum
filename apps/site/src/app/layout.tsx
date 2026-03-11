import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Poppins } from "next/font/google"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { GoogleTagManager } from "@/components/gtm"
import "./globals.css"
import Script from "next/script"

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


export const metadata: Metadata = {
  title: "Luminum Agency - Professional Web Development & Design Services",
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
  metadataBase: new URL("https://luminum.agency"),
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
        url: "/og-image.png",
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
    images: ["/og-image.png"],
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
  verification: {
    google: "your-google-verification-code",
  },
}

export const viewport: Viewport = {
  themeColor: "#0B22E1",
  width: "device-width",
  initialScale: 1,
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-9CNYPQJQHR"
          strategy="afterInteractive"
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-9CNYPQJQHR');
            `,
          }}
        />

        {/* Luminum Analytics */}
        <Script
          src="https://analytics.luminum.agency/script.js?websiteId=ef4cc088-5c62-4cb6-8ce7-10204e266621"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} ${poppins.variable} font-sans`}>
        <GoogleTagManager />
        <Header />
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
