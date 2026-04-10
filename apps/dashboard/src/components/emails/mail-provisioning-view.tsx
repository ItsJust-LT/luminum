"use client"

import { motion } from "framer-motion"
import { Mail, Sparkles } from "lucide-react"
import { AppPageContainer } from "@/components/app-shell/app-page-container"

/**
 * Shown when workspace mail is enabled but backend setup is not complete yet.
 * Deliberately vendor-neutral — no third-party provider names.
 */
export function MailProvisioningView(props: { workspaceName?: string | null }) {
  const name = props.workspaceName?.trim()

  return (
    <AppPageContainer fullWidth>
      <div className="relative flex min-h-[min(85dvh,720px)] items-center justify-center overflow-hidden px-4 py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.18),transparent)]" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 mx-auto w-full max-w-lg text-center"
        >
          <div className="relative mx-auto mb-10 h-36 w-36 sm:h-44 sm:w-44">
            <motion.div
              className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent ring-1 ring-primary/20 shadow-lg shadow-primary/5"
              animate={{ rotate: [0, 1.5, 0, -1.5, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-[10%] flex items-center justify-center rounded-3xl bg-card ring-1 ring-border/60"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Mail className="h-16 w-16 text-primary sm:h-[4.5rem] sm:w-[4.5rem]" strokeWidth={1.35} />
              </motion.div>
            </motion.div>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-full bg-primary/70"
                style={{
                  left: `${28 + i * 22}%`,
                  bottom: "12%",
                }}
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Mail for your workspace
          </motion.div>

          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Almost there
          </h1>
          <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {name ? (
              <>
                <span className="font-medium text-foreground">{name}</span> mail is being turned on. Your inbox should be
                ready <span className="text-foreground">soon</span>—check back in a little while.
              </>
            ) : (
              <>
                Your team mail is being turned on. Your inbox should be ready <span className="text-foreground">soon</span>
                —check back in a little while.
              </>
            )}
          </p>

          <motion.div
            className="mx-auto mt-10 h-1 max-w-xs overflow-hidden rounded-full bg-muted"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <motion.div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary/40 via-primary to-primary/40"
              animate={{ x: ["-100%", "280%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          <p className="mt-8 text-sm text-muted-foreground">
            Need access right away? Ask your workspace administrator.
          </p>
        </motion.div>
      </div>
    </AppPageContainer>
  )
}
