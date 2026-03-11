'use client'
import { useEffect, useState } from "react"
import Link from "next/link"
import { X, Download, Share, ExternalLink } from "lucide-react"

const DISMISS_STORAGE_KEY = 'luminum-install-prompt-dismissed-until'
const DISMISS_DAYS = 7

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

// Only show install prompt on mobile devices (not Windows/desktop browsers)
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
}

export default function InstallPrompt() {
  const [isMobile, setIsMobile] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const mobile = isMobileDevice()
    setIsMobile(mobile)
    if (!mobile) return

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(iOS)

    // Check if app is already installed (standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    // Listen for beforeinstallprompt event (Chrome, Edge, etc.)
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event fired')
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Save the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
      // Show install prompt after a delay or based on user interaction
      setTimeout(() => setShowInstallPrompt(true), 2000)
    }

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed')
      setDeferredPrompt(null)
      setIsInstallable(false)
      setShowInstallPrompt(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    // For iOS, show install prompt if not standalone and not in PWA mode
    if (iOS && !standalone) {
      setTimeout(() => setShowInstallPrompt(true), 3000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Clear the deferredPrompt
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    try {
      const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000
      localStorage.setItem(DISMISS_STORAGE_KEY, String(until))
    } catch {
      sessionStorage.setItem('install-prompt-dismissed', 'true')
    }
  }

  const isDismissed = (() => {
    if (typeof window === 'undefined') return true
    try {
      const until = localStorage.getItem(DISMISS_STORAGE_KEY)
      if (!until) return sessionStorage.getItem('install-prompt-dismissed') === 'true'
      return Date.now() < Number(until)
    } catch {
      return sessionStorage.getItem('install-prompt-dismissed') === 'true'
    }
  })()

  // Only show on mobile; hide if already installed, dismissed (session or 7-day), or not yet shown
  if (!isMobile || isStandalone || isDismissed || !showInstallPrompt) {
    return null
  }

  return (
    <>
      {/* Install Banner */}
      <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 z-50 shadow-lg">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-3">
            <Download className="w-6 h-6" />
            <div>
              <h3 className="font-semibold">Install Luminum</h3>
              <p className="text-sm opacity-90">
                Get the full app experience with offline access and notifications
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isIOS ? (
              <div className="text-right flex flex-col items-end gap-1">
                <p className="text-sm font-medium">Tap Share <Share className="inline w-4 h-4" /> then &quot;Add to Home Screen&quot;</p>
                <Link href="/install" className="text-xs underline opacity-90 hover:opacity-100 flex items-center gap-1">
                  See step-by-step guide <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            ) : deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
              >
                Install
              </button>
            ) : (
              <Link href="/install" className="bg-white/20 text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-colors text-sm inline-flex items-center gap-1">
                See install guide <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Modal */}
      {isIOS && showInstallPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Install Luminum
              </h3>
              <p className="text-gray-600 mb-6">
                Add this app to your home screen for quick access and a better experience.
              </p>
              
              <div className="space-y-4 text-left">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Tap the Share button</p>
                    <div className="flex items-center space-x-1 text-blue-600">
                      <Share className="w-4 h-4" />
                      <span className="text-sm">at the bottom of your screen</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Select "Add to Home Screen"</p>
                    <p className="text-sm text-gray-600">Scroll down if you don't see it</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Tap "Add"</p>
                    <p className="text-sm text-gray-600">The app will appear on your home screen</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="w-full mt-6 bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}