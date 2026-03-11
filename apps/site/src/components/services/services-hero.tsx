"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function ServicesHero() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[90vh] flex items-center justify-center bg-white pt-28 pb-20 px-4 md:px-6 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#302cff]/5 via-white to-[#00d9ff]/5" />

      <div
        className="absolute top-20 right-10 w-64 h-64 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-[#302cff]/20 to-[#00d9ff]/20 blur-3xl animate-pulse"
        style={{ animationDuration: "4s" }}
      />
      <div
        className="absolute bottom-20 left-10 w-72 h-72 md:w-[450px] md:h-[450px] rounded-full bg-gradient-to-br from-[#7cff6b]/15 to-[#ff6b35]/15 blur-3xl animate-pulse"
        style={{ animationDuration: "5s", animationDelay: "1s" }}
      />

      <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div
          className={`transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#302cff]/10 to-[#00d9ff]/10 backdrop-blur-sm border border-[#302cff]/20 rounded-full px-5 py-2.5 mb-6">
            <Sparkles className="w-4 h-4 text-[#302cff]" />
            <span className="text-[#302cff] text-sm font-bold">Our Services</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 mb-6 leading-[1.1] text-balance">
            Elevate Your
            <br />
            <span className="bg-gradient-to-r from-[#302cff] via-[#5b57ff] to-[#00d9ff] bg-clip-text text-transparent">
              Digital Presence
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 mb-8 leading-relaxed text-pretty">
            From stunning web design to powerful marketing strategies, we offer comprehensive solutions tailored to your
            brand's unique needs. Let's build something extraordinary together.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/contact">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-[#302cff] to-[#5b57ff] hover:from-[#2820dd] hover:to-[#4a46ee] text-white font-bold text-base px-8 py-6 h-auto rounded-xl shadow-lg shadow-[#302cff]/30 group"
              >
                <span className="flex items-center gap-2">
                  Start Your Project
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Button>
            </Link>
            <Link href="#pricing">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-2 border-[#302cff]/30 text-[#302cff] hover:bg-[#302cff]/5 font-bold text-base px-8 py-6 h-auto rounded-xl bg-transparent"
              >
                View Pricing
              </Button>
            </Link>
          </div>
        </div>

        <div
          className={`relative transition-all duration-1000 delay-200 ${
            isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
          }`}
        >
          <div className="relative w-full aspect-square max-w-xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-[#302cff]/20 to-[#00d9ff]/20 rounded-3xl transform rotate-6" />
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <Image
                src="/services-creative-team.jpg"
                alt="Creative team working on digital projects"
                width={600}
                height={600}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-gradient-to-br from-[#302cff] to-[#5b57ff] rounded-2xl p-6 shadow-2xl border-4 border-white">
              <p className="text-white font-bold text-lg mb-1">100+</p>
              <p className="text-white/90 text-sm">Projects Delivered</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
