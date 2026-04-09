import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";
import { MobilePwaGate } from "@/components/pwa/mobile-pwa-gate";
import { NotificationToastManager } from "@/components/notifications";
import { EnhancedNotificationPopupContainer } from "@/components/notifications/enhanced-notification-popup";
import { NotificationClickHandler } from "@/components/notifications/notification-click-handler";
import { APP, METADATA } from "@/lib/constants";
import { headers } from "next/headers";
import { absoluteBrandingIconUrls } from "@/lib/branding-icon-url";

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers()
  const isCustomDomain = hdrs.get("x-custom-domain") === "true"
  const orgName = hdrs.get("x-org-name")
  const orgLogo = hdrs.get("x-org-logo")
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || ""
  const proto = hdrs.get("x-forwarded-proto") || "https"

  const appName = isCustomDomain && orgName ? orgName : APP.name
  const title = isCustomDomain && orgName ? `${orgName} - Dashboard` : METADATA.defaultTitle
  const description = isCustomDomain && orgName ? `${orgName} Dashboard` : APP.tagline

  const brandUrls =
    isCustomDomain && orgName && host
      ? absoluteBrandingIconUrls({ host, proto, orgName, orgLogo })
      : null

  const customOgImage =
    isCustomDomain && orgName && !orgLogo?.trim() && brandUrls ? brandUrls.primary : null

  const icons: Metadata["icons"] = brandUrls
    ? {
        icon: [
          { url: brandUrls.icon192, type: brandUrls.type, sizes: "192x192" },
          { url: brandUrls.icon512, type: brandUrls.type, sizes: "512x512" },
        ],
        apple: [{ url: brandUrls.icon180, sizes: "180x180", type: brandUrls.type }],
        shortcut: [{ url: brandUrls.icon192, type: brandUrls.type }],
      }
    : {
        icon: [
          { url: "/favicon.ico", sizes: "any" },
          { url: "/icon.svg", type: "image/svg+xml" },
        ],
        apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      }

  const other: Record<string, string> = {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": appName,
    "application-name": appName,
    "msapplication-TileColor": "#000000",
  }
  if (brandUrls) {
    other["msapplication-TileImage"] = brandUrls.primary
  } else {
    other["msapplication-TileImage"] = "/mstile-144x144.png"
    other["msapplication-config"] = "/browserconfig.xml"
  }

  return {
    title: {
      default: title,
      template: isCustomDomain && orgName ? `%s | ${orgName}` : METADATA.titleTemplate,
    },
    description,
    keywords: ['PWA', 'Dashboard'],
    authors: [{ name: appName }],
    creator: appName,
    publisher: appName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      title,
      description,
      siteName: appName,
      images: orgLogo?.trim()
        ? [{ url: orgLogo.trim(), width: 512, height: 512, alt: appName }]
        : customOgImage
          ? [{ url: customOgImage, width: 512, height: 512, alt: appName }]
          : [{ url: '/og-image.png', width: 1200, height: 630, alt: `${APP.name} PWA` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: orgLogo?.trim() ? [orgLogo.trim()] : customOgImage ? [customOgImage] : ['/og-image.png'],
    },
    robots: {
      index: !isCustomDomain,
      follow: !isCustomDomain,
      googleBot: {
        index: !isCustomDomain,
        follow: !isCustomDomain,
        'max-video-preview': -1,
        'max-image-preview': 'large' as const,
        'max-snippet': -1,
      },
    },
    manifest: "/manifest.json",
    icons,
    other,
  }
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hdrs = await headers()
  const isCustomDomain = hdrs.get("x-custom-domain") === "true"

  return (
    <html lang="en">
        {/* Favicon, apple-touch-icon, manifest: generateMetadata (org branding on custom domains). */}
        {!isCustomDomain ? (
          <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
        ) : null}
        <meta name="format-detection" content="telephone=no" />
        <meta name="format-detection" content="date=no" />
        <meta name="format-detection" content="address=no" />
        <meta name="format-detection" content="email=no" />
      <body className="min-h-screen bg-background text-foreground antialiased">
<Providers>
        <MobilePwaGate>
        {children}
        </MobilePwaGate>
        <PWAUpdatePrompt />
        <NotificationToastManager />
        <EnhancedNotificationPopupContainer />
        <NotificationClickHandler />

        </Providers>
        <ServiceWorkerRegistration />

        <Toaster />
      </body>
    </html>
  );
}



// Component to handle PWA updates
function PWAUpdatePrompt() {
  return (
    <div
      id="pwa-update-available"
      className="bg-popover/90 text-popover-foreground border-border/70 hidden fixed right-4 bottom-4 z-50 rounded-lg border p-4 shadow-lg backdrop-blur-md"
    >
      <p className="text-sm font-medium">App update available!</p>
      <button 
        id="pwa-refresh" 
        className="bg-primary text-primary-foreground mt-2 rounded-md px-3 py-1 text-sm font-medium hover:bg-primary/90"
      >
        Refresh
      </button>
    </div>
  )
}

// Client-side service worker registration
function ServiceWorkerRegistration() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                  console.log('SW registered: ', registration);
                  
                  // Handle updates
                  registration.addEventListener('updatefound', function() {
                    const newWorker = registration.installing;
                    if (newWorker) {
                      newWorker.addEventListener('statechange', function() {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                          // Show update notification
                          const updateDiv = document.getElementById('pwa-update-available');
                          const refreshBtn = document.getElementById('pwa-refresh');
                          if (updateDiv && refreshBtn) {
                            updateDiv.classList.remove('hidden');
                            refreshBtn.addEventListener('click', function() {
                              newWorker.postMessage({ type: 'SKIP_WAITING' });
                              window.location.reload();
                            });
                          }
                        }
                      });
                    }
                  });
                })
                .catch(function(registrationError) {
                  console.log('SW registration failed: ', registrationError);
                });
            });

            // Handle service worker updates
            navigator.serviceWorker.addEventListener('controllerchange', function() {
              window.location.reload();
            });
          }

        `,
      }}
    />
  )
}