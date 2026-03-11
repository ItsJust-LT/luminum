"use client"

import { useRef, useState, useEffect } from "react"
import { motion, useInView } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles, Code2, Palette, TrendingUp, Zap, Rocket, Users, Award } from "lucide-react"

export default function HeroSection() {
  const heroRef = useRef(null)
  const isInView = useInView(heroRef, { once: true, amount: 0.2 })
  const [counters, setCounters] = useState({ projects: 0, satisfaction: 0, years: 0, revenue: 0 })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.15,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.23, 1, 0.32, 1],
      },
    },
  }

  useEffect(() => {
    if (!isInView) return

    const duration = 2000
    const startTime = Date.now()
    const targets = { projects: 200, satisfaction: 98, years: 15, revenue: 50 }

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      setCounters({
        projects: Math.floor(targets.projects * progress),
        satisfaction: Math.floor(targets.satisfaction * progress),
        years: Math.floor(targets.years * progress),
        revenue: Math.floor(targets.revenue * progress),
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }, [isInView])

  const services = [
    { icon: Code2, text: "Web Development", color: "from-[#302cff] to-[#5b57ff]" },
    { icon: Palette, text: "Design & UX", color: "from-[#ff6b35] to-[#ff8a5c]" },
    { icon: TrendingUp, text: "Digital Marketing", color: "from-[#00d9ff] to-[#00f5d4]" },
  ]

  const achievements = [
    {
      value: `${counters.projects}+`,
      label: "Projects Delivered",
      highlight: "Award-winning solutions",
      icon: Rocket,
      gradient: "from-[#302cff] to-[#5b57ff]",
    },
    {
      value: `${counters.satisfaction}%`,
      label: "Client Satisfaction",
      highlight: "Consistent excellence",
      icon: Award,
      gradient: "from-[#ff6b35] to-[#ff8a5c]",
    },
    {
      value: `${counters.years}+`,
      label: "Industry Experience",
      highlight: "Trusted expertise",
      icon: Users,
      gradient: "from-[#00d9ff] to-[#00f5d4]",
    },
    {
      value: `$${counters.revenue}M+`,
      label: "Revenue Generated",
      highlight: "Real business growth",
      icon: TrendingUp,
      gradient: "from-[#b846f5] to-[#d175ff]",
    },
  ]

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center pt-24 sm:pt-28 md:pt-32 pb-12 sm:pb-16 overflow-hidden bg-white"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-[#302cff]/20 via-[#302cff]/10 to-transparent rounded-full blur-3xl" />

        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-[#ff6b35]/15 via-[#ff6b35]/8 to-transparent rounded-full blur-3xl" />

        <div className="absolute top-1/2 -translate-y-1/2 -right-32 w-72 h-72 bg-gradient-to-br from-[#00d9ff]/20 via-[#00d9ff]/10 to-transparent rounded-full blur-3xl" />

        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-br from-[#b846f5]/15 via-[#b846f5]/8 to-transparent rounded-full blur-3xl" />

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/50 pointer-events-none" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(0deg, transparent 24%, rgba(48, 44, 255, 0.05) 25%, rgba(48, 44, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(48, 44, 255, 0.05) 75%, rgba(48, 44, 255, 0.05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(48, 44, 255, 0.05) 25%, rgba(48, 44, 255, 0.05) 26%, transparent 27%, transparent 74%, rgba(48, 44, 255, 0.05) 75%, rgba(48, 44, 255, 0.05) 76%, transparent 77%, transparent)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl">
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {/* Left content */}
          <motion.div className="space-y-6 sm:space-y-8" variants={itemVariants}>
            <motion.div
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#302cff]/5 border border-[#302cff]/20"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#302cff]" />
              <span className="text-xs sm:text-sm font-semibold text-[#302cff]">Web Design & Development</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight text-slate-900">
              <span className="block">Transform Your</span>
              <span className="block bg-gradient-to-r from-[#302cff] to-[#5b57ff] bg-clip-text text-transparent">
                Online Success
              </span>
            </h1>

            <motion.p
              className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl font-medium"
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
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all duration-300"
                    whileHover={{ y: -3, backgroundColor: "rgba(100, 116, 139, 0.05)" }}
                  >
                    <div className={`bg-gradient-to-br ${service.color} p-1 sm:p-1.5 rounded-md`}>
                      <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">{service.text}</span>
                  </motion.div>
                )
              })}
            </motion.div>

            <motion.div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4" variants={itemVariants}>
              <Link href="/contact" className="w-full sm:w-auto">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto bg-gradient-to-r from-[#302cff] to-[#5b57ff] hover:from-[#2820dd] hover:to-[#4a46ee] text-white shadow-lg hover:shadow-xl shadow-[#302cff]/30 px-6 sm:px-12 py-2.5 sm:py-4 text-sm sm:text-lg font-semibold transition-all duration-300"
                  >
                    <span className="flex items-center justify-center gap-2">
                      Start Your Project
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                      >
                        <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                      </motion.div>
                    </span>
                  </Button>
                </motion.div>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-slate-300 text-slate-800 hover:bg-slate-50 px-6 sm:px-12 py-2.5 sm:py-4 text-sm sm:text-lg font-semibold bg-transparent"
              >
                View Our Work
              </Button>
            </motion.div>
          </motion.div>

          {/* Right image section - hidden on mobile, shown on lg+ */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="relative">
              <motion.div
                className="relative rounded-2xl overflow-hidden shadow-xl ring-1 ring-slate-200"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#302cff]/5 to-transparent pointer-events-none" />
                <Image
                  src="/modern-office-technology-team-collaboration.jpg"
                  alt="Web design and development team collaboration"
                  width={500}
                  height={600}
                  className="w-full h-auto object-cover"
                  priority
                />
              </motion.div>

              {/* Stats floating card - top left */}
              <motion.div
                className="absolute -top-8 -left-8 bg-white rounded-xl p-4 shadow-lg border border-slate-200 backdrop-blur-md w-56"
                animate={{ y: [0, -15, 0], rotate: [-2, 0, -2] }}
                transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#302cff] to-[#5b57ff] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Code2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-sm">
                    <div className="font-bold text-slate-900 text-lg">200+</div>
                    <div className="text-slate-600 text-xs">Sites Built</div>
                  </div>
                </div>
              </motion.div>

              {/* Ratings floating card - bottom right */}
              <motion.div
                className="absolute -bottom-8 -right-8 bg-white rounded-xl p-4 shadow-lg border border-slate-200 backdrop-blur-md w-56"
                animate={{ y: [0, 15, 0], rotate: [2, 0, 2] }}
                transition={{ duration: 6.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 0.5 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#ff6b35] to-[#ff8a5c] rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-sm">
                    <div className="font-bold text-slate-900 text-lg">4.9/5</div>
                    <div className="text-slate-600 text-xs">Client Rating</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>

        {/* Completely redesigned stats section with icons, cards, and gradient backgrounds */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-16 sm:pt-20 mt-16 sm:pt-20"
          variants={containerVariants}
        >
          {achievements.map((stat, index) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={index}
                className="relative group"
                variants={itemVariants}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.3 }}
              >
                <div className="relative p-6 rounded-2xl bg-white border-2 border-slate-200 shadow-sm hover:shadow-xl hover:border-[#302cff]/30 transition-all duration-300 overflow-hidden">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`}
                  />

                  {/* Icon */}
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 space-y-2">
                    <div className={`text-4xl font-black bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>
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

      {/* Bottom fade gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
    </section>
  )
}
