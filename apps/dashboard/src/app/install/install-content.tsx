'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Share, MoreVertical, Smartphone, Monitor, Plus, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { orgBrandIconProxyUrl } from '@/lib/org-brand-icon'

type Platform = 'ios' | 'android' | 'desktop'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'desktop'
}

const platformLabels: Record<Platform, string> = {
  ios: 'iPhone / iPad',
  android: 'Android',
  desktop: 'Desktop',
}

const platformIcons: Record<Platform, typeof Smartphone> = {
  ios: Smartphone,
  android: Smartphone,
  desktop: Monitor,
}

interface Step {
  title: string
  description: string
  icon?: React.ReactNode
}

function getSteps(platform: Platform): Step[] {
  if (platform === 'ios') {
    return [
      {
        title: 'Open in Safari',
        description: 'Make sure you\'re viewing this page in Safari — other browsers on iOS don\'t support installing apps.',
      },
      {
        title: 'Tap the Share button',
        description: 'It\'s the square with an arrow at the bottom of the screen.',
        icon: <Share className="h-5 w-5" />,
      },
      {
        title: 'Tap "Add to Home Screen"',
        description: 'Scroll down in the share menu if you don\'t see it right away.',
        icon: <Plus className="h-5 w-5" />,
      },
      {
        title: 'Tap "Add"',
        description: 'The app icon will appear on your home screen. Open it to get started!',
        icon: <Check className="h-5 w-5" />,
      },
    ]
  }

  if (platform === 'android') {
    return [
      {
        title: 'Open in Chrome',
        description: 'For the best experience, use Google Chrome.',
      },
      {
        title: 'Tap the menu',
        description: 'Tap the three-dot menu (⋮) in the top right corner of Chrome.',
        icon: <MoreVertical className="h-5 w-5" />,
      },
      {
        title: 'Tap "Install app"',
        description: 'You may also see it as "Add to Home screen".',
        icon: <Download className="h-5 w-5" />,
      },
      {
        title: 'Confirm installation',
        description: 'Tap "Install" in the dialog. The app will appear in your app drawer.',
        icon: <Check className="h-5 w-5" />,
      },
    ]
  }

  // desktop
  return [
    {
      title: 'Use Chrome or Edge',
      description: 'Open this page in Google Chrome or Microsoft Edge.',
    },
    {
      title: 'Click the install icon',
      description: 'Look for the install icon (⊕) in the address bar and click it.',
      icon: <Download className="h-5 w-5" />,
    },
    {
      title: 'Confirm installation',
      description: 'Click "Install" in the dialog. The app will open in its own window like a native app.',
      icon: <Check className="h-5 w-5" />,
    },
  ]
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as const } },
}

interface InstallContentProps {
  orgName?: string
  orgLogo?: string
}

export default function InstallContent({ orgName, orgLogo }: InstallContentProps) {
  const appName = orgName || 'Luminum'
  const installIconSrc = orgLogo?.trim()
    ? orgLogo.trim()
    : orgName
      ? orgBrandIconProxyUrl(orgName)
      : '/images/logo.png'
  const installIconUnopt = !!(orgLogo?.trim() || orgName)
  const [platform, setPlatform] = useState<Platform>('ios')
  const [detected, setDetected] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    const p = detectPlatform()
    setPlatform(p)
    setDetected(true)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setDeferredPrompt(null))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleNativeInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setDeferredPrompt(null)
    } finally {
      setInstalling(false)
    }
  }

  const steps = getSteps(platform)
  const platforms: Platform[] = ['ios', 'android', 'desktop']

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col pb-[env(safe-area-inset-bottom)]">
      <div className="flex-1 flex flex-col items-center justify-start px-5 pt-[max(env(safe-area-inset-top),1.5rem)] pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center text-center mt-4 mb-8 w-full max-w-sm"
        >
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 ring-1 ring-primary/20">
            <Image src={installIconSrc} alt={appName} width={36} height={36} className="h-9 w-9 object-contain" unoptimized={installIconUnopt} />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-2">
            Install {appName}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            Add {appName} to your home screen for instant access, notifications, and the best experience.
          </p>
        </motion.div>

        {/* Native install CTA for Android */}
        <AnimatePresence>
          {deferredPrompt && platform === 'android' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm mb-6"
            >
              <button
                onClick={handleNativeInstall}
                disabled={installing}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-primary px-5 py-3.5 text-primary-foreground font-semibold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform disabled:opacity-70"
              >
                <Download className="h-5 w-5" />
                {installing ? 'Installing\u2026' : 'Install App'}
              </button>
              <p className="text-center text-xs text-muted-foreground mt-2.5">
                Or follow the steps below to install manually
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Platform switcher */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="w-full max-w-sm mb-6"
        >
          <div className="flex gap-1 p-1 rounded-xl bg-muted/50 ring-1 ring-border/40">
            {platforms.map((p) => {
              const Icon = platformIcons[p]
              const active = p === platform
              return (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={cn(
                    'relative flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="platform-pill"
                      className="absolute inset-0 rounded-lg bg-background shadow-sm ring-1 ring-border/50"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {platformLabels[p]}
                  </span>
                </button>
              )
            })}
          </div>
          {detected && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-[11px] text-muted-foreground/60 mt-1.5"
            >
              {detectPlatform() === platform ? 'Auto-detected for your device' : 'Showing instructions for another device'}
            </motion.p>
          )}
        </motion.div>

        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.ol
            key={platform}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="w-full max-w-sm space-y-3"
          >
            {steps.map((step, i) => (
              <motion.li key={i} variants={itemVariants} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold ring-1 ring-primary/20">
                    {i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 bg-border/40 mt-1.5" />
                  )}
                </div>
                <div className="pb-5">
                  <p className="font-medium text-foreground text-sm leading-snug flex items-center gap-2">
                    {step.title}
                    {step.icon && <span className="text-muted-foreground">{step.icon}</span>}
                  </p>
                  <p className="text-muted-foreground text-sm mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-auto pt-8 text-center w-full max-w-sm"
        >
          <p className="text-sm text-muted-foreground">
            After installing, open the app from your home screen and{' '}
            <Link href="/sign-in" className="text-primary font-medium hover:underline">
              sign in
            </Link>{' '}
            to get started.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
