"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Star, Quote } from 'lucide-react'
import Image from "next/image"

export default function TestimonialsSection() {
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

  const testimonials = [
    {
      name: "Sarah Mitchell",
      role: "CEO & Founder",
      company: "TechVenture Inc",
      image: "/client-sarah-mitchell.jpg",
      content:
        "Working with Luminum was transformative for our business. They didn't just build us a website – they became strategic partners who genuinely cared about our success. Our online conversions tripled within the first 3 months.",
      color: "#302cff",
      industry: "B2B SaaS Platform",
      result: "+250% Conversions",
    },
    {
      name: "Marcus Chen",
      role: "Marketing Director",
      company: "GrowthLab Digital",
      image: "/client-marcus-chen.jpg",
      content:
        "I've worked with over a dozen agencies in my career, but Luminum stands apart. Their ability to blend stunning design with marketing strategy that actually drives results is remarkable. The ROI has been incredible.",
      color: "#ff6b35",
      industry: "Marketing Agency",
      result: "5x ROI in 6 months",
    },
    {
      name: "Emily Rodriguez",
      role: "Owner",
      company: "Luxe Boutique",
      image: "/client-emily-rodriguez.jpg",
      content:
        "From our very first call, I knew Luminum was different. They listened deeply and truly understood what makes our brand special. The e-commerce platform they created is beautiful and our customers absolutely love it.",
      color: "#00d9ff",
      industry: "Fashion E-Commerce",
      result: "+200% Online Sales",
    },
  ]

  return (
    <section ref={sectionRef} className="py-24 md:py-32 px-4 md:px-6 bg-slate-50 relative overflow-hidden">
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-gradient-to-r from-[#302cff]/8 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-gradient-to-l from-[#00d9ff]/8 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div
          className={`text-center mb-20 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-block mb-6">
            <span className="px-4 py-2 bg-[#302cff]/10 text-[#302cff] rounded-full text-sm font-bold tracking-wide uppercase">
              Client Love Stories
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-balance leading-tight text-slate-900">
            What Our Partners{" "}
            <span className="bg-gradient-to-r from-[#302cff] via-[#00d9ff] to-[#b846f5] bg-clip-text text-transparent">
              Say About Us
            </span>
          </h2>
          <p className="text-slate-600 text-lg md:text-xl max-w-3xl mx-auto text-pretty leading-relaxed">
            Don't just take our word for it. Here's what it's really like to partner with Luminum, straight from the
            people who matter most – our clients.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`relative bg-white border-2 border-slate-200 rounded-3xl p-8 transition-all duration-700 hover:shadow-xl hover:border-[#302cff]/40 hover:-translate-y-1 group ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: isVisible ? `${index * 100}ms` : "0ms",
              }}
            >
              <div
                className="absolute top-8 right-8 w-14 h-14 rounded-2xl flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity duration-300"
                style={{ backgroundColor: testimonial.color }}
              >
                <Quote className="w-7 h-7" style={{ color: testimonial.color }} />
              </div>

              <div className="flex gap-1 mb-6 relative z-10">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-5 h-5 fill-current"
                    style={{ color: testimonial.color }}
                  />
                ))}
              </div>

              <p className="text-slate-700 text-base leading-relaxed mb-8 relative z-10">
                "{testimonial.content}"
              </p>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-offset-2 shadow-md transition-transform duration-300 group-hover:scale-105"
                    style={{ "--tw-ring-color": testimonial.color } as CSSProperties}
                  >
                    <Image
                      src={testimonial.image || "/placeholder.svg"}
                      alt={testimonial.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 text-base mb-1">{testimonial.name}</h4>
                    <p className="text-slate-600 text-sm font-semibold">{testimonial.role}</p>
                    <p className="text-slate-800 text-sm font-bold mt-0.5">{testimonial.company}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">
                    {testimonial.industry}
                  </span>
                  <span
                    className="px-3 py-1.5 rounded-lg text-xs font-black text-white"
                    style={{ backgroundColor: testimonial.color }}
                  >
                    {testimonial.result}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
