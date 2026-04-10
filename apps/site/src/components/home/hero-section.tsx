"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView, useReducedMotion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Sparkles,
  Code2,
  Palette,
  TrendingUp,
  Zap,
  Rocket,
  Users,
  Award,
} from "lucide-react"
import { EASE_OUT } from "@/lib/motion"
import { SITE } from "@/lib/site-copy"

const { stats: S, statLabels: L } = SITE

export default function HeroSection() {
  const heroRef = useRef(null)
  const isInView = useInView(heroRef, { once: true, amount: 0.15 })
  const reduceMotion = useReducedMotion()
  const [counters, setCounters] = useState({
    projects: 0,
    satisfaction: 0,
    years: 0,
    revenue: 0,
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: reduceMotion
        ? { duration: 0 }
        : {
            staggerChildren: 0.09,
            delayChildren: 0.08,
          },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 18 },
    visible: {
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0 }
        : { duration: 0.52, ease: EASE_OUT },
    },
  }

  useEffect(() => {
    if (!isInView || reduceMotion) {
      if (isInView && reduceMotion) {
        setCounters({
          projects: S.projectsN,
          satisfaction: S.satisfactionN,
          years: S.yearsN,
          revenue: S.revenueKN,
        })
      }
      return
    }

    const duration = 1800
    const startTime = Date.now()
    const targets = {
      projects: S.projectsN,
      satisfaction: S.satisfactionN,
      years: S.yearsN,
      revenue: S.revenueKN,
    }

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - (1 - progress) ** 3

      setCounters({
        projects: Math.floor(targets.projects * eased),
        satisfaction: Math.floor(targets.satisfaction * eased),
        years: Math.floor(targets.years * eased),
        revenue: Math.floor(targets.revenue * eased),
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }, [isInView, reduceMotion])

  const services = [
    { icon: Code2, text: "Web Development", color: "from-[#302cff] to-[#5b57ff]" },
    { icon: Palette, text: "Design & UX", color: "from-[#ff6b35] to-[#ff8a5c]" },
    { icon: TrendingUp, text: "Digital Marketing", color: "from-[#00d9ff] to-[#00f5d4]" },
  ]

  const achievements = [
    {
      value: `${counters.projects}+`,
      label: L.projectsDelivered,
      highlight: "Strategy, design, and build",
      icon: Rocket,
      gradient: "from-[#302cff] to-[#5b57ff]",
    },
    {
      value: `${counters.satisfaction}%`,
      label: L.clientSatisfaction,
      highlight: "Consistent quality",
      icon: Award,
      gradient: "from-[#ff6b35] to-[#ff8a5c]",
    },
    {
      value: `${counters.years}+`,
      label: L.yearsExperience,
      highlight: "Across SA-focused work",
      icon: Users,
      gradient: "from-[#00d9ff] to-[#00f5d4]",
    },
    {
      value: `R${counters.revenue}k+`,
      label: L.revenueImpact,
      highlight: "Reported client impact",
      icon: TrendingUp,
      gradient: "from-[#b846f5] to-[#d175ff]",
    },
  ]

  const floatTransition = reduceMotion
    ? undefined
    : { duration: 5.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" as const }

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-white pb-14 pt-[calc(5.5rem+env(safe-area-inset-top))] sm:pb-16 sm:pt-28 md:pt-32"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-gradient-to-br from-[#302cff]/18 via-[#302cff]/8 to-transparent blur-3xl sm:h-80 sm:w-80" />
        <div className="absolute -bottom-36 -left-28 h-[22rem] w-[22rem] rounded-full bg-gradient-to-tr from-[#ff6b35]/14 via-[#ff6b35]/6 to-transparent blur-3xl" />
        <div className="absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#00d9ff]/16 to-transparent blur-3xl" />
        <div className="absolute left-1/4 top-1/4 h-56 w-56 rounded-full bg-gradient-to-br from-[#b846f5]/12 to-transparent blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/60" />
        <div
          className="absolute inset-0 opacity-[0.14] sm:opacity-[0.18]"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(48, 44, 255, 0.055) 25%, rgba(48, 44, 255, 0.055) 26%, transparent 27%, transparent 74%, rgba(48, 44, 255, 0.055) 75%, rgba(48, 44, 255, 0.055) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(48, 44, 255, 0.055) 25%, rgba(48, 44, 255, 0.055) 26%, transparent 27%, transparent 74%, rgba(48, 44, 255, 0.055) 75%, rgba(48, 44, 255, 0.055) 76%, transparent 77%, transparent)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="grid grid-cols-1 items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.div className="space-y-6 sm:space-y-8" variants={itemVariants}>
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-[#302cff]/20 bg-[#302cff]/5 px-3 py-1.5 sm:px-4 sm:py-2"
              whileHover={reduceMotion ? {} : { scale: 1.03 }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
            >
              <Sparkles className="h-3.5 w-3.5 text-[#302cff] sm:h-4 sm:w-4" />
              <span className="text-xs font-semibold text-[#302cff] sm:text-sm">
                Web Design &amp; Development · South Africa
              </span>
            </motion.div>

            <h1 className="font-heading text-balance text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
              <span className="block">Transform Your</span>
              <span className="block bg-gradient-to-r from-[#302cff] to-[#5b57ff] bg-clip-text text-transparent">
                Online Success
              </span>
            </h1>

            <motion.p
              className="max-w-2xl text-pretty text-base font-medium leading-relaxed text-slate-600 sm:text-lg md:text-xl"
              variants={itemVariants}
            >
              We build high-performing websites, create unforgettable digital experiences, and drive real business
              results through strategic design and marketing that converts.
            </motion.p>

            <motion.div className="flex flex-wrap gap-2 sm:gap-3" variants={itemVariants}>
              {services.map((service, index) => {
                const Icon = service.icon
                return (
                  <motion.div
                    key={index}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-2"
                    whileHover={reduceMotion ? {} : { y: -3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  >
                    <div className={`rounded-md bg-gradient-to-br ${service.color} p-1 sm:p-1.5`}>
                      <Icon className="h-3 w-3 text-white sm:h-4 sm:w-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 sm:text-sm">{service.text}</span>
                  </motion.div>
                )
              })}
            </motion.div>

            <motion.div
              className="flex flex-col gap-3 pt-1 sm:flex-row sm:gap-4 sm:pt-2"
              variants={itemVariants}
            >
              <Link href="/contact" className="w-full sm:w-auto">
                <motion.div
                  className="w-full"
                  whileHover={reduceMotion ? {} : { scale: 1.02 }}
                  whileTap={reduceMotion ? {} : { scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    className="w-full rounded-2xl bg-gradient-to-r from-[#302cff] to-[#5b57ff] px-8 py-6 text-base font-semibold text-white shadow-lg shadow-[#302cff]/28 transition-[box-shadow] hover:from-[#2820dd] hover:to-[#4a46ee] hover:shadow-xl sm:w-auto sm:px-12 sm:text-lg"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Start Your Project
                      {reduceMotion ? (
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      ) : (
                        <motion.span
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                          className="inline-flex"
                        >
                          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                        </motion.span>
                      )}
                    </span>
                  </Button>
                </motion.div>
              </Link>
              <Link href="/portfolio" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-auto w-full rounded-2xl border-slate-300/90 bg-white/70 px-8 py-6 text-base font-semibold text-slate-800 backdrop-blur-sm hover:bg-white sm:w-auto sm:px-12 sm:text-lg"
                >
                  View Our Work
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="relative hidden lg:block"
            initial={reduceMotion ? false : { opacity: 0, x: 32 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 32 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.65, delay: 0.12, ease: EASE_OUT }
            }
          >
            <div className="relative">
              <motion.div
                className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-slate-200/80"
                animate={
                  reduceMotion ? {} : { y: [0, -8, 0] }
                }
                transition={floatTransition}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#302cff]/8 to-transparent" />
                <Image
                  src="/modern-office-technology-team-collaboration.jpg"
                  alt="Web design and development team collaboration"
                  width={560}
                  height={680}
                  className="h-auto w-full object-cover"
                  priority
                  sizes="(min-width: 1024px) 42vw, 100vw"
                />
              </motion.div>

              <motion.div
                className="absolute -left-6 top-10 w-56 rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:-left-8 sm:-top-8"
                animate={
                  reduceMotion ? {} : { y: [0, -10, 0], rotate: [-1.5, 0, -1.5] }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#302cff] to-[#5b57ff]">
                    <Code2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900">{S.projectsDelivered}</div>
                    <div className="text-xs text-slate-600">{L.projectsDelivered}</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute -bottom-6 -right-6 w-56 rounded-xl border border-slate-200/80 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:-bottom-8 sm:-right-8"
                animate={
                  reduceMotion ? {} : { y: [0, 10, 0], rotate: [1.5, 0, 1.5] }
                }
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        duration: 6.5,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: 0.4,
                      }
                }
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#ff8a5c]">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-slate-900">{S.clientRating}</div>
                    <div className="text-xs text-slate-600">{L.clientRating}</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-14 grid grid-cols-1 gap-4 pt-4 sm:mt-16 sm:grid-cols-2 sm:gap-5 sm:pt-6 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {achievements.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={index}
                className="group relative"
                variants={itemVariants}
                whileHover={reduceMotion ? {} : { y: -5 }}
                transition={{ type: "spring", stiffness: 360, damping: 22 }}
              >
                <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200/90 bg-white p-6 shadow-sm transition-shadow duration-300 group-hover:border-[#302cff]/35 group-hover:shadow-xl">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.04]`}
                  />
                  <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${stat.gradient} p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="relative z-10 space-y-1.5">
                    <div
                      className={`text-3xl font-black bg-gradient-to-br sm:text-4xl ${stat.gradient} bg-clip-text text-transparent`}
                    >
                      {stat.value}
                    </div>
                    <div className="text-base font-bold text-slate-900">{stat.label}</div>
                    <div className="text-sm text-slate-600">{stat.highlight}</div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-white via-white/85 to-transparent" />
    </section>
  )
}
