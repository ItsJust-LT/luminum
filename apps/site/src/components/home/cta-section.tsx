"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, ArrowRight, Phone, Zap, Heart, Star } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa6"
import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { STAGGER_CHILDREN, FADE_UP } from "@/lib/motion"
import { SITE } from "@/lib/site-copy"

export default function CTASection() {
  const reduceMotion = useReducedMotion()

  const stagger = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : STAGGER_CHILDREN

  const fadeUp = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : FADE_UP

  const benefits = [
    { icon: Zap, text: "Lightning-fast turnaround" },
    { icon: Heart, text: "Dedicated support team" },
    { icon: Star, text: "Award-winning designs" },
  ]

  return (
    <section
      className="relative overflow-hidden px-4 py-24 sm:px-6 md:py-32"
      aria-labelledby="cta-heading"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#302cff] via-[#5b57ff] to-[#00d9ff]" />
      <div className="absolute inset-0 opacity-25">
        <div className="absolute left-10 top-16 h-56 w-56 rounded-full bg-gradient-to-br from-[#ff6b35]/50 to-transparent blur-3xl sm:left-20" />
        <div className="absolute bottom-16 right-10 h-64 w-64 rounded-full bg-gradient-to-br from-[#b846f5]/45 to-transparent blur-3xl sm:right-20" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#7cff6b]/30 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px", amount: 0.25 }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-8 flex justify-center sm:mb-10">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/35 bg-white/18 px-5 py-2.5 shadow-lg backdrop-blur-xl sm:px-6 sm:py-3">
              <Star className="h-5 w-5 text-[#7cff6b]" aria-hidden />
              <span className="text-sm font-black tracking-wide text-white sm:text-base">
                Let&apos;s Build Something Extraordinary
              </span>
            </div>
          </motion.div>

          <motion.h2
            id="cta-heading"
            variants={fadeUp}
            className="font-heading mb-6 text-center text-4xl font-black leading-[1.06] text-balance text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Ready to
            <br />
            <span className="relative mt-1 inline-block sm:mt-2">
              <span className="bg-gradient-to-r from-[#7cff6b] via-[#00f5d4] to-white bg-clip-text text-transparent">
                Transform
              </span>
              <span className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-gradient-to-r from-[#7cff6b] via-[#00f5d4] to-white/90 sm:-bottom-2 sm:h-1.5" />
            </span>
            <br />
            Your Brand?
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mx-auto mb-10 max-w-3xl text-center text-lg font-bold leading-relaxed text-white text-pretty sm:mb-12 sm:text-xl md:text-2xl"
          >
            Your success story starts here. Let&apos;s turn your vision into a digital masterpiece that captivates,
            converts, and conquers.
          </motion.p>

          <motion.div
            className="mb-10 grid grid-cols-1 gap-3 sm:mb-12 sm:grid-cols-3 sm:gap-4"
            variants={stagger}
          >
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon
              return (
                <motion.div
                  key={benefit.text}
                  variants={fadeUp}
                  custom={index}
                  className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-white/35 bg-white/14 px-4 py-3 shadow-lg backdrop-blur-lg sm:px-5 sm:py-4"
                  whileHover={reduceMotion ? undefined : { scale: 1.03, backgroundColor: "rgba(255,255,255,0.2)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className="rounded-xl bg-white/22 p-2.5">
                    <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" aria-hidden />
                  </div>
                  <span className="text-left text-sm font-bold text-white sm:text-base">{benefit.text}</span>
                </motion.div>
              )
            })}
          </motion.div>

          <motion.div
            className="mb-10 flex flex-col items-center gap-4 sm:mb-10"
            variants={fadeUp}
          >
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
              <Link
                href={`https://wa.me/${SITE.phoneTel}`}
                className="w-full sm:w-auto"
                rel="noopener noreferrer"
              >
                <motion.div
                  whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    className="h-auto w-full rounded-2xl bg-white px-8 py-6 text-base font-black text-[#302cff] shadow-2xl hover:bg-white/95 sm:w-auto sm:px-10 sm:text-lg"
                  >
                    <span className="flex items-center justify-center gap-3">
                      <FaWhatsapp className="h-6 w-6 text-green-600" aria-hidden />
                      WhatsApp: {SITE.phoneDisplay}
                    </span>
                  </Button>
                </motion.div>
              </Link>
              <Link href="tel:0689186043" className="w-full sm:w-auto">
                <motion.div
                  whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-auto w-full rounded-2xl border-2 border-white/55 bg-white/12 px-8 py-6 text-base font-black text-white backdrop-blur-xl hover:bg-white/22 sm:w-auto sm:px-10 sm:text-lg"
                  >
                    <span className="flex items-center justify-center gap-3">
                      <Phone className="h-6 w-6" aria-hidden />
                      Call Now
                    </span>
                  </Button>
                </motion.div>
              </Link>
            </div>

            <Link href="/contact" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="ghost"
                className="group h-auto w-full rounded-2xl px-8 py-4 text-base font-bold text-white hover:bg-white/12 sm:w-auto"
              >
                <span className="flex items-center gap-2">
                  Or send us a message
                  <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="flex flex-col items-center justify-center gap-3 text-center text-sm font-bold text-white sm:flex-row sm:flex-wrap sm:gap-6 sm:text-base"
            variants={fadeUp}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#7cff6b]" aria-hidden />
              <span>24h Response Time</span>
            </div>
            <span className="hidden h-1.5 w-1.5 rounded-full bg-white/45 sm:inline" aria-hidden />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#7cff6b]" aria-hidden />
              <span>No Obligation Chat</span>
            </div>
            <span className="hidden h-1.5 w-1.5 rounded-full bg-white/45 sm:inline" aria-hidden />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#7cff6b]" aria-hidden />
              <span>{SITE.stats.clientSatisfaction} client satisfaction</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
