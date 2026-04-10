"use client"

import { Zap, Shield, Rocket, Users, Globe, TrendingUp } from "lucide-react"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { EASE_OUT, STAGGER_CHILDREN, FADE_UP } from "@/lib/motion"

export default function FeaturesSection() {
  const reduceMotion = useReducedMotion()

  const stagger = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : STAGGER_CHILDREN

  const fadeUp = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : FADE_UP

  const features = [
    {
      icon: Rocket,
      title: "Website Design & Development",
      description:
        "Beautiful, lightning-fast websites that captivate visitors and turn them into loyal customers. We blend creativity with conversion-focused design.",
      color: "#302cff",
    },
    {
      icon: Zap,
      title: "Digital Marketing That Works",
      description:
        "Stop wasting money on ads that don't deliver. Our strategic campaigns reach the right audience and drive real, measurable growth for your business.",
      color: "#ff6b35",
    },
    {
      icon: Shield,
      title: "SEO & Content Strategy",
      description:
        "Get found by customers actively searching for you. Our proven SEO strategies boost your visibility and establish your authority in your industry.",
      color: "#00d9ff",
    },
    {
      icon: Users,
      title: "Brand Identity & Design",
      description:
        "Stand out from the crowd with a memorable brand that resonates. We create visual identities that tell your unique story and build emotional connections.",
      color: "#b846f5",
    },
    {
      icon: Globe,
      title: "E-Commerce Solutions",
      description:
        "Transform browsers into buyers with stunning online stores. We build powerful e-commerce platforms designed to maximize sales and delight your customers.",
      color: "#7cff6b",
    },
    {
      icon: TrendingUp,
      title: "Analytics & Growth",
      description:
        "Make data-driven decisions with confidence. We provide deep insights and actionable strategies to continuously optimize and scale your success.",
      color: "#ff6b35",
    },
  ]

  return (
    <section
      className="relative overflow-hidden bg-white px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="features-heading"
    >
      <div className="pointer-events-none absolute top-24 right-0 h-[min(28rem,80vw)] w-[min(28rem,80vw)] rounded-full bg-gradient-to-l from-[#302cff]/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 left-0 h-[min(28rem,80vw)] w-[min(28rem,80vw)] rounded-full bg-gradient-to-r from-[#ff6b35]/10 to-transparent blur-3xl" />

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
              What We Do Best
            </span>
          </motion.div>
          <motion.h2
            id="features-heading"
            variants={fadeUp}
            className="font-heading mb-6 text-balance text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-5xl lg:text-6xl"
          >
            Your Success is{" "}
            <span className="bg-gradient-to-r from-[#302cff] via-[#5b57ff] to-[#00d9ff] bg-clip-text text-transparent">
              Our Mission
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="mx-auto max-w-3xl text-pretty text-lg leading-relaxed text-slate-600 md:text-xl"
          >
            We pour our hearts into every project, combining technical excellence with creative passion to deliver
            solutions that truly make a difference for your business.
          </motion.p>
        </motion.div>

        <motion.div
          className="mb-14 md:mb-20"
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.55, ease: EASE_OUT }}
        >
          <div className="group relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 shadow-2xl shadow-slate-900/8">
            <Image
              src="/creative-team-brainstorming-session.jpg"
              alt="Luminum Agency team collaborating on creative projects"
              width={1200}
              height={600}
              className="h-auto w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              sizes="(max-width: 1024px) 100vw, 64rem"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:p-10">
              <p className="text-balance text-lg font-bold leading-snug md:text-2xl">
                Our passionate team of designers, developers, and marketers working together to bring your vision to life
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px", amount: 0.12 }}
          variants={stagger}
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.article
                key={index}
                variants={fadeUp}
                className="group relative rounded-3xl border-2 border-slate-200/90 bg-white p-6 shadow-sm transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#302cff]/40 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-8"
                whileHover={reduceMotion ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 380, damping: 26 }}
              >
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
                  style={{
                    background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)`,
                  }}
                >
                  <Icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-black text-slate-900 transition-colors duration-200 group-hover:text-[#302cff] sm:text-2xl">
                  {feature.title}
                </h3>
                <p className="text-base leading-relaxed text-slate-600">{feature.description}</p>
                <div
                  className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle at top right, ${feature.color}08, transparent 65%)`,
                  }}
                />
              </motion.article>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
