"use client"

import { useEffect, useRef, useState } from "react"
import { Lightbulb, Pencil, Code, Rocket } from 'lucide-react'
import Image from "next/image"

export default function ProcessSection() {
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
    <section ref={sectionRef} className="py-24 md:py-32 px-4 md:px-6 bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-l from-[#302cff]/8 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-r from-[#ff6b35]/8 to-transparent rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div
          className={`text-center mb-20 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-block mb-6">
            <span className="px-4 py-2 bg-[#302cff]/10 text-[#302cff] rounded-full text-sm font-bold tracking-wide uppercase">
              How We Work
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-balance leading-tight text-slate-900">
            A Journey We Take{" "}
            <span className="bg-gradient-to-r from-[#302cff] via-[#b846f5] to-[#ff6b35] bg-clip-text text-transparent">
              Together
            </span>
          </h2>
          <p className="text-slate-600 text-lg md:text-xl max-w-3xl mx-auto text-pretty leading-relaxed">
            Every great project starts with a conversation. Here's how we transform your ideas into digital experiences
            that make an impact.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div
                key={index}
                className={`relative transition-all duration-700 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{
                  transitionDelay: isVisible ? `${index * 100}ms` : "0ms",
                }}
              >
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-24 left-[60%] w-full h-0.5 z-0 bg-gradient-to-r from-slate-300 to-transparent" />
                )}

                <div className="relative bg-white border-2 border-slate-200 rounded-3xl overflow-hidden hover:border-[#302cff]/40 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 group">
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <Image
                      src={step.image || "/placeholder.svg"}
                      alt={step.title}
                      width={400}
                      height={300}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0 opacity-25 group-hover:opacity-40 transition-opacity duration-500"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
                        mixBlendMode: "multiply",
                      }}
                    />

                    <div
                      className="absolute top-4 right-4 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white shadow-lg"
                      style={{ backgroundColor: step.color }}
                    >
                      {step.number}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300"
                        style={{
                          background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
                        }}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <h3 className="text-xl font-black mb-3 text-slate-900 group-hover:text-[#302cff] transition-colors duration-300">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
