"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, Sparkles } from 'lucide-react'
import { Button } from "@/components/ui/button"
import Image from "next/image"

export default function PortfolioSection() {
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

  const projects = [
    {
      title: "Luxe Fashion Boutique",
      category: "E-Commerce & Brand Identity",
      description:
        "We transformed a beloved local boutique into a stunning online destination that captures the essence of luxury fashion. The result? A 250% increase in online sales and customers who can't stop raving about the experience.",
      image: "/project-fashion-ecommerce.jpg",
      gradient: "from-[#302cff] to-[#5b57ff]",
      stats: { metric: "+250%", label: "Sales Growth" },
      tags: ["Shopify", "Branding", "UX Design"],
    },
    {
      title: "TechStart Analytics Platform",
      category: "SaaS Dashboard & Data Visualization",
      description:
        "Complex data doesn't have to be overwhelming. We designed an analytics platform that makes sense of millions of data points through intuitive visualizations, leading to 85% higher user retention.",
      image: "/project-saas-dashboard.jpg",
      gradient: "from-[#ff6b35] to-[#ff8a5c]",
      stats: { metric: "85%", label: "Higher Retention" },
      tags: ["React", "Dashboard", "API Integration"],
    },
    {
      title: "FitLife Wellness App",
      category: "Mobile App & Community Platform",
      description:
        "We created an experience that celebrates progress and builds community. With over 100K downloads and a 4.8-star rating, FitLife users say it genuinely changed their relationship with health.",
      image: "/project-fitness-app.jpg",
      gradient: "from-[#00d9ff] to-[#00f5d4]",
      stats: { metric: "100K+", label: "Happy Users" },
      tags: ["React Native", "Community", "Gamification"],
    },
  ]

  return (
    <section ref={sectionRef} id="portfolio" className="py-24 md:py-32 px-4 md:px-6 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[#302cff]/8 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tl from-[#ff6b35]/8 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div
          className={`text-center mb-20 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-block mb-6">
            <span className="px-4 py-2 bg-[#302cff]/10 text-[#302cff] rounded-full text-sm font-bold tracking-wide uppercase">
              Featured Projects
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-balance leading-tight text-slate-900">
            Real Projects,{" "}
            <span className="bg-gradient-to-r from-[#302cff] via-[#00d9ff] to-[#ff6b35] bg-clip-text text-transparent">
              Real Impact
            </span>
          </h2>
          <p className="text-slate-600 text-lg md:text-xl max-w-3xl mx-auto text-pretty leading-relaxed">
            Each project tells a unique story of collaboration, creativity, and measurable growth. These aren't just
            websites – they're success stories we're incredibly proud to share.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-3xl transition-all duration-700 hover:shadow-2xl cursor-pointer ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: isVisible ? `${index * 100}ms` : "0ms",
              }}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 border-2 border-slate-200 rounded-t-3xl">
                <Image
                  src={project.image || "/placeholder.svg"}
                  alt={project.title}
                  width={600}
                  height={450}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${project.gradient} opacity-15 mix-blend-multiply transition-opacity duration-500 group-hover:opacity-30`}
                />

                <div className="absolute top-6 right-6 bg-white rounded-xl px-4 py-3 shadow-lg border-2 border-white/50 transition-transform duration-300 group-hover:scale-105">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-[#ff6b35]" />
                    <div
                      className={`text-2xl font-black bg-gradient-to-r ${project.gradient} bg-clip-text text-transparent`}
                    >
                      {project.stats.metric}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 font-bold">{project.stats.label}</div>
                </div>
              </div>

              <div className="bg-white border-2 border-slate-200 border-t-0 rounded-b-3xl p-7 group-hover:border-[#302cff]/40 transition-colors duration-500">
                <div className="mb-3">
                  <span
                    className={`text-sm font-bold bg-gradient-to-r ${project.gradient} bg-clip-text text-transparent uppercase tracking-wide`}
                  >
                    {project.category}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-[#302cff] transition-colors duration-300">
                  {project.title}
                </h3>
                <p className="text-slate-600 text-base leading-relaxed mb-5">{project.description}</p>

                <div className="flex flex-wrap gap-2 mb-6">
                  {project.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Button
                  variant="outline"
                  className="w-full border-2 border-slate-300 text-slate-900 hover:border-[#302cff] hover:text-[#302cff] hover:bg-[#302cff]/5 font-bold transition-all duration-300 group-hover:translate-x-1 bg-white rounded-xl"
                >
                  View Case Study
                  <ArrowUpRight className="ml-2 w-5 h-5 transition-transform duration-300 group-hover:rotate-12" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
