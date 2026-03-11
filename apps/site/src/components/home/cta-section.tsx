"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ArrowRight, Phone, Zap, Heart, Star } from 'lucide-react'
import { FaWhatsapp } from "react-icons/fa6"
import Link from "next/link"

export default function CTASection() {
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

  const benefits = [
    { icon: Zap, text: "Lightning-fast turnaround" },
    { icon: Heart, text: "Dedicated support team" },
    { icon: Star, text: "Award-winning designs" },
  ]

  return (
    <section ref={sectionRef} className="relative py-32 md:py-40 px-4 md:px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#302cff] via-[#5b57ff] to-[#00d9ff]" />

      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-gradient-to-br from-[#ff6b35]/60 to-transparent blur-3xl" />
        <div className="absolute bottom-20 right-20 w-72 h-72 rounded-full bg-gradient-to-br from-[#b846f5]/60 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-br from-[#7cff6b]/40 to-transparent blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div
          className={`transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2.5 bg-white/20 backdrop-blur-xl border border-white/30 rounded-full px-6 py-3 mb-10 shadow-xl">
            <Star className="w-5 h-5 text-[#7cff6b]" />
            <span className="text-white text-base font-black tracking-wide">
              Let's Build Something Extraordinary
            </span>
          </div>

          <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white mb-8 text-balance leading-[1.05] text-center">
            Ready to
            <br />
            <span className="relative inline-block mt-2">
              <span className="bg-gradient-to-r from-[#7cff6b] via-[#00f5d4] to-white bg-clip-text text-transparent">
                Transform
              </span>
              <div className="absolute -bottom-2 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7cff6b] via-[#00f5d4] to-white rounded-full" />
            </span>
            <br />
            Your Brand?
          </h2>

          <p className="text-white text-xl md:text-2xl mb-12 max-w-3xl mx-auto text-pretty leading-relaxed font-bold text-center">
            Your success story starts here. Let's turn your vision into a digital masterpiece that captivates, converts,
            and conquers.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 bg-white/15 backdrop-blur-lg border border-white/30 rounded-2xl px-5 py-4 shadow-lg transition-all duration-500 hover:bg-white/20 hover:scale-105 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{
                  transitionDelay: `${index * 80 + 200}ms`,
                }}
              >
                <div className="bg-white/20 rounded-xl p-2.5">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-base font-bold flex-1">{benefit.text}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center gap-5 mb-10">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Link href="https://wa.me/27689186043" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="group w-full sm:w-auto bg-white text-[#302cff] hover:bg-white/95 font-black text-lg px-10 py-7 h-auto shadow-2xl hover:shadow-[0_20px_50px_rgba(255,255,255,0.3)] transition-all duration-300 hover:scale-105 rounded-2xl"
                >
                  <span className="flex items-center justify-center gap-3">
                    <FaWhatsapp className="w-6 h-6 text-green-500" />
                    <span>WhatsApp: 068 918 6043</span>
                  </span>
                </Button>
              </Link>
              <Link href="tel:0689186043" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="group w-full sm:w-auto bg-white/15 backdrop-blur-xl border-2 border-white/50 text-white hover:bg-white/25 hover:border-white/70 font-black text-lg px-10 py-7 h-auto transition-all duration-300 hover:scale-105 rounded-2xl"
                >
                  <span className="flex items-center justify-center gap-3">
                    <Phone className="w-6 h-6" />
                    <span>Call Now</span>
                  </span>
                </Button>
              </Link>
            </div>

            <Link href="/contact" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="ghost"
                className="group w-full sm:w-auto text-white hover:bg-white/10 font-bold text-base px-8 py-4 h-auto rounded-2xl"
              >
                <span className="flex items-center gap-2">
                  Or send us a message
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white text-base font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#7cff6b]" />
              <span>24h Response Time</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/40" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#7cff6b]" />
              <span>No Obligation Chat</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-white/40" />
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#7cff6b]" />
              <span>98% Client Satisfaction</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
