import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, Share, Smartphone, Monitor, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Install Luminum',
  description: 'Install Luminum as an app on your phone or computer for the best experience.',
}

export default function InstallPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Install Luminum</h1>
            <p className="text-muted-foreground">Add the app to your device for quick access and notifications.</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* iOS */}
          <section className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
              <Smartphone className="h-5 w-5" />
              iPhone / iPad (Safari)
            </h2>
            <ol className="space-y-4 list-decimal list-inside text-muted-foreground">
              <li>Open this page in <strong className="text-foreground">Safari</strong> (Chrome on iOS cannot add to Home Screen the same way).</li>
              <li>Tap the <Share className="inline h-4 w-4" /> <strong className="text-foreground">Share</strong> button at the bottom of the screen.</li>
              <li>Scroll and tap <strong className="text-foreground">&quot;Add to Home Screen&quot;</strong>.</li>
              <li>Tap <strong className="text-foreground">&quot;Add&quot;</strong> in the top right. The Luminum icon will appear on your home screen.</li>
            </ol>
          </section>

          {/* Android */}
          <section className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
              <Smartphone className="h-5 w-5" />
              Android (Chrome)
            </h2>
            <p className="text-muted-foreground mb-4">
              When you visit Luminum in Chrome, you may see an <strong className="text-foreground">Install app</strong> or <strong className="text-foreground">Add to Home screen</strong> prompt. Tap it to install.
            </p>
            <p className="text-muted-foreground">
              If you don’t see a prompt: open the <strong className="text-foreground">⋮</strong> menu → <strong className="text-foreground">Install app</strong> or <strong className="text-foreground">Add to Home screen</strong>.
            </p>
          </section>

          {/* Desktop */}
          <section className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-4">
              <Monitor className="h-5 w-5" />
              Desktop (Chrome / Edge)
            </h2>
            <p className="text-muted-foreground mb-4">
              In Chrome or Edge, look for an install icon in the address bar (⊕ or “Install”) and click it. You can also use the menu: <strong className="text-foreground">Apps</strong> → <strong className="text-foreground">Install Luminum</strong>.
            </p>
            <p className="text-muted-foreground">
              Once installed, Luminum will open in its own window like a native app.
            </p>
          </section>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Already have the app? <Link href="/sign-in" className="text-primary hover:underline">Sign in</Link> to get started.
        </p>
      </div>
    </div>
  )
}
