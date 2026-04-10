"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, Heart, MapPin, Sparkles, Target, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SITE } from "@/lib/site-copy"
import { EASE_OUT, FADE_UP, STAGGER_CHILDREN } from "@/lib/motion"
import CTASection from "@/components/home/cta-section"

const values = [
  {
    title: "Clarity first",
    body: "We strip away noise so your message, UX, and tech stack work together — no vanity features, just outcomes.",
    icon: Target,
    gradient: "from-[#302cff] to-[#5b57ff]",
  },
  {
    title: "Partners, not vendors",
    body: "You get direct communication, honest timelines, and recommendations that protect your budget and your brand.",
    icon: Heart,
    gradient: "from-[#ff6b35] to-[#ff8a5c]",
  },
  {
    title: "Built to scale",
    body: "Fast, accessible, SEO-aware foundations so you can grow content, campaigns, and product without rebuilding every year.",
    icon: Zap,
    gradient: "from-[#00d9ff] to-[#00f5d4]",
  },
]

export function AboutView() {
  const reduceMotion = useReducedMotion()
  const stagger = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : STAGGER_CHILDREN
  const fadeUp = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : FADE_UP

  const statCards = [
    { label: SITE.statLabels.projectsDelivered, value: SITE.stats.projectsDelivered },
    { label: SITE.statLabels.clientSatisfaction, value: SITE.stats.clientSatisfaction },
    { label: SITE.statLabels.yearsExperience, value: SITE.stats.yearsExperience },
    { label: SITE.statLabels.revenueImpact, value: SITE.stats.revenueImpactDisplay },
  ]

  return (
    <>
      <section
        className="relative overflow-hidden bg-white px-4 pb-16 pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pb-20 sm:pt-28 md:pt-32"
        aria-labelledby="about-hero-heading"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-[#302cff]/15 to-transparent blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-gradient-to-tr from-[#ff6b35]/12 to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="mx-auto max-w-3xl text-center"
          >
            <motion.div variants={fadeUp}>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#302cff]/20 bg-[#302cff]/5 px-4 py-2 text-sm font-semibold text-[#302cff]">
                <Sparkles className="h-4 w-4" aria-hidden />
                About us · {SITE.city}, {SITE.country}
              </span>
            </motion.div>
            <motion.h1
              id="about-hero-heading"
              variants={fadeUp}
              className="font-heading mb-6 text-balance text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl"
            >
              We help South African brands{" "}
              <span className="bg-gradient-to-r from-[#302cff] to-[#5b57ff] bg-clip-text text-transparent">
                win online
              </span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-pretty text-lg leading-relaxed text-slate-600 md:text-xl"
            >
              {SITE.shortDescription}
            </motion.p>
            <motion.p variants={fadeUp} className="mt-4 text-pretty text-base font-medium text-slate-700 md:text-lg">
              {SITE.missionLine}
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link href="/contact" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full rounded-2xl bg-gradient-to-r from-[#302cff] to-[#5b57ff] px-8 font-semibold text-white shadow-lg shadow-[#302cff]/25 sm:w-auto"
                >
                  Start a project
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/services" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full rounded-2xl border-slate-300 bg-white/80 px-8 font-semibold backdrop-blur-sm sm:w-auto"
                >
                  View services
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-14 grid grid-cols-2 gap-3 sm:mt-16 sm:grid-cols-4 sm:gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
          >
            {statCards.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 text-center shadow-sm backdrop-blur-sm sm:p-5"
              >
                <div className="font-heading text-2xl font-black text-[#302cff] sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs font-semibold text-slate-600 sm:text-sm">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section
        className="border-t border-slate-100 bg-slate-50/80 px-4 py-16 sm:py-20 md:py-24"
        aria-labelledby="about-story-heading"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: EASE_OUT }}
            className="relative order-2 lg:order-1"
          >
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-900/8">
              <Image
                src="/creative-team-brainstorming-session.jpg"
                alt=""
                width={900}
                height={700}
                className="h-auto w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </motion.div>
          <motion.div
            className="order-1 space-y-5 lg:order-2"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
          >
            <motion.span variants={fadeUp} className="text-sm font-bold uppercase tracking-wide text-[#302cff]">
              Our approach
            </motion.span>
            <motion.h2
              id="about-story-heading"
              variants={fadeUp}
              className="font-heading text-3xl font-black leading-tight text-slate-900 sm:text-4xl md:text-5xl"
            >
              Design and engineering, grounded in your business goals
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg leading-relaxed text-slate-600">
              Luminum is a {SITE.country}-focused studio: we ship marketing sites, lead funnels, e-commerce, and ongoing
              improvements — always with performance, accessibility, and SEO in mind.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="flex flex-wrap items-start gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700"
            >
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#302cff]" aria-hidden />
              <span>
                Based in <strong>{SITE.city}</strong>, {SITE.region} — serving clients across {SITE.country} remotely
                and on-site where it helps.
              </span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:py-20 md:py-24" aria-labelledby="about-values-heading">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="mb-12 text-center md:mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              id="about-values-heading"
              variants={fadeUp}
              className="font-heading text-3xl font-black text-slate-900 sm:text-4xl md:text-5xl"
            >
              How we work
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
              Simple principles that keep projects calm, fast, and measurable.
            </motion.p>
          </motion.div>

          <motion.div
            className="grid gap-5 md:grid-cols-3 md:gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={stagger}
          >
            {values.map((v) => {
              const Icon = v.icon
              return (
                <motion.article
                  key={v.title}
                  variants={fadeUp}
                  className="rounded-3xl border-2 border-slate-200/90 bg-white p-6 shadow-sm transition-shadow hover:border-[#302cff]/35 hover:shadow-lg md:p-8"
                  whileHover={reduceMotion ? undefined : { y: -3 }}
                >
                  <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${v.gradient} p-3 shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-slate-900">{v.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{v.body}</p>
                </motion.article>
              )
            })}
          </motion.div>
        </div>
      </section>

      <CTASection />
    </>
  )
}
