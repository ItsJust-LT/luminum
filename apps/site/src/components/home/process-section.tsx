"use client"

import { Lightbulb, Pencil, Code, Rocket } from "lucide-react"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { STAGGER_CHILDREN, FADE_UP } from "@/lib/motion"

export default function ProcessSection() {
  const reduceMotion = useReducedMotion()

  const stagger = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : STAGGER_CHILDREN

  const fadeUp = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : FADE_UP

  const steps = [
    {
      number: "01",
      title: "Discovery & Connection",
      description:
        "We start by truly getting to know you, your vision, and your audience. This isn't just a brief – it's the beginning of a partnership built on understanding and trust.",
      icon: Lightbulb,
      color: "#302cff",
      image: "/process-discovery.jpg",
    },
    {
      number: "02",
      title: "Creative Magic",
      description:
        "Our designers craft experiences that don't just look beautiful – they feel right. Every element is thoughtfully designed to resonate with your audience and reflect your brand's soul.",
      icon: Pencil,
      color: "#ff6b35",
      image: "/process-design.jpg",
    },
    {
      number: "03",
      title: "Building Excellence",
      description:
        "Your vision comes to life through meticulous development. We build with care, ensuring every interaction is smooth, every feature is powerful, and every detail is perfect.",
      icon: Code,
      color: "#00d9ff",
      image: "/process-development.jpg",
    },
    {
      number: "04",
      title: "Launch & Beyond",
      description:
        "The launch is just the beginning. We're with you for the long haul, optimizing, growing, and celebrating your success together as true partners.",
      icon: Rocket,
      color: "#b846f5",
      image: "/process-launch.jpg",
    },
  ]

  return (
    <section
      className="relative overflow-hidden bg-slate-50 px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="process-heading"
    >
      <div className="pointer-events-none absolute top-0 right-0 h-[min(28rem,85vw)] w-[min(28rem,85vw)] rounded-full bg-gradient-to-l from-[#302cff]/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[min(28rem,85vw)] w-[min(28rem,85vw)] rounded-full bg-gradient-to-r from-[#ff6b35]/10 to-transparent blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          className="mb-14 text-center md:mb-20"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px", amount: 0.3 }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <span className="mb-5 inline-block rounded-full bg-[#302cff]/10 px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#302cff]">
              How We Work
            </span>
          </motion.div>
          <motion.h2
            id="process-heading"
            variants={fadeUp}
            className="font-heading mb-6 text-balance text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl"
          >
            A Journey We Take{" "}
            <span className="bg-gradient-to-r from-[#302cff] via-[#b846f5] to-[#ff6b35] bg-clip-text text-transparent">
              Together
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-3xl text-pretty text-lg leading-relaxed text-slate-600 md:text-xl"
          >
            Every great project starts with a conversation. Here&apos;s how we transform your ideas into digital
            experiences that make an impact.
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px", amount: 0.1 }}
          variants={stagger}
        >
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div key={step.number} variants={fadeUp} className="relative">
                {index < steps.length - 1 ? (
                  <div
                    className="absolute top-28 left-[58%] hidden h-0.5 w-full bg-gradient-to-r from-slate-300/90 to-transparent lg:block"
                    aria-hidden
                  />
                ) : null}

                <motion.article
                  className="group relative h-full overflow-hidden rounded-3xl border-2 border-slate-200/90 bg-white shadow-sm transition-shadow duration-300 hover:border-[#302cff]/40 hover:shadow-xl motion-reduce:hover:border-slate-200"
                  whileHover={reduceMotion ? undefined : { y: -4 }}
                  transition={{ type: "spring", stiffness: 360, damping: 28 }}
                >
                  <div className="relative h-44 overflow-hidden bg-slate-100 sm:h-48">
                    <Image
                      src={step.image || "/placeholder.svg"}
                      alt=""
                      width={400}
                      height={300}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      sizes="(max-width: 768px) 100vw, 25vw"
                      loading="lazy"
                    />
                    <div
                      className="absolute inset-0 opacity-25 transition-opacity duration-500 group-hover:opacity-40 motion-reduce:transition-none"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
                        mixBlendMode: "multiply",
                      }}
                    />
                    <div
                      className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl text-sm font-black text-white shadow-lg sm:right-4 sm:top-4"
                      style={{ backgroundColor: step.color }}
                      aria-hidden
                    >
                      {step.number}
                    </div>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div
                      className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl shadow-md transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
                      }}
                    >
                      <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
                    </div>
                    <h3 className="mb-2 text-lg font-black text-slate-900 transition-colors group-hover:text-[#302cff] sm:text-xl">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">{step.description}</p>
                  </div>
                </motion.article>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
