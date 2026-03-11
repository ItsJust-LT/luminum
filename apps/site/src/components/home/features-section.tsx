"use client"

import { Zap, Shield, Rocket, Users, Globe, TrendingUp } from 'lucide-react'
import { useEffect, useRef, useState } from "react"
import Image from "next/image"

export default function FeaturesSection() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

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
    <section ref={sectionRef} className="py-24 md:py-32 px-4 md:px-6 bg-white relative overflow-hidden">
      <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-l from-[#302cff]/8 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-[500px] h-[500px] bg-gradient-to-r from-[#ff6b35]/8 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div
          className={`text-center mb-20 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-block mb-6">
            <span className="px-4 py-2 bg-[#302cff]/10 text-[#302cff] rounded-full text-sm font-bold tracking-wide uppercase">
              What We Do Best
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-balance leading-tight text-slate-900">
            Your Success is{" "}
            <span className="bg-gradient-to-r from-[#302cff] via-[#5b57ff] to-[#00d9ff] bg-clip-text text-transparent">
              Our Mission
            </span>
          </h2>
          <p className="text-slate-600 text-lg md:text-xl max-w-3xl mx-auto text-pretty leading-relaxed">
            We pour our hearts into every project, combining technical excellence with creative passion to deliver
            solutions that truly make a difference for your business.
          </p>
        </div>

        <div
          className={`mb-20 transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative rounded-3xl overflow-hidden shadow-2xl max-w-5xl mx-auto group border-2 border-slate-100">
            <Image
              src="/creative-team-brainstorming-session.jpg"
              alt="Luminum Agency team collaborating on creative projects"
              width={1200}
              height={600}
              className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-8 left-8 right-8 text-white">
              <p className="text-xl md:text-2xl font-bold text-balance leading-snug">
                Our passionate team of designers, developers, and marketers working together to bring your vision to
                life
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative bg-white border-2 border-slate-200 rounded-3xl p-8 hover:border-[#302cff]/40 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: isVisible ? `${index * 80 + 400}ms` : "0ms",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${feature.color}, ${feature.color}dd)`,
                }}
              >
                <feature.icon className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl font-black mb-3 text-slate-900 group-hover:text-[#302cff] transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-slate-600 text-base leading-relaxed">{feature.description}</p>

              <div
                className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at top right, ${feature.color}06, transparent 70%)`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
