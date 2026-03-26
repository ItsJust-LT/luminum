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

export async function generateMetadata(): Promise<Metadata> {
  const hdrs = await headers()
  const isCustomDomain = hdrs.get("x-custom-domain") === "true"
  const orgName = hdrs.get("x-org-name")
  const orgLogo = hdrs.get("x-org-logo")

  const appName = isCustomDomain && orgName ? orgName : APP.name
  const title = isCustomDomain && orgName ? `${orgName} - Dashboard` : METADATA.defaultTitle
  const description = isCustomDomain && orgName ? `${orgName} Dashboard` : APP.tagline

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
      images: orgLogo
        ? [{ url: orgLogo, width: 512, height: 512, alt: appName }]
        : [{ url: '/og-image.png', width: 1200, height: 630, alt: `${APP.name} PWA` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: orgLogo ? [orgLogo] : ['/og-image.png'],
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
    manifest: '/manifest.json',
    other: {
      'mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
      'apple-mobile-web-app-title': appName,
      'application-name': appName,
      'msapplication-TileColor': '#000000',
      'msapplication-config': '/browserconfig.xml',
    },
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


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        
        {/* Apple-specific PWA meta tags */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#000000" />
        
        {/* Microsoft-specific PWA meta tags */}
        <meta name="msapplication-TileImage" content="/mstile-144x144.png" />
        <meta name="msapplication-TileColor" content="#000000" />
        
        {/* Additional PWA enhancements */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="format-detection" content="date=no" />
        <meta name="format-detection" content="address=no" />
        <meta name="format-detection" content="email=no" />
      <body
      >
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
    <div id="pwa-update-available" className="hidden fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50">
      <p className="text-sm font-medium">App update available!</p>
      <button 
        id="pwa-refresh" 
        className="mt-2 bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
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