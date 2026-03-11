"use client"

import { useEffect, useRef, useState } from "react"
import { MapPin, Clock, Heart, Award, Users, Zap } from "lucide-react"
import Image from "next/image"

export default function ContactInfo() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

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

  const stats = [
    { icon: Users, value: "100+", label: "Happy Clients" },
    { icon: Award, value: "150+", label: "Projects Completed" },
    { icon: Zap, value: "98%", label: "Satisfaction Rate" },
    { icon: Heart, value: "24/7", label: "Support Available" },
  ]

  return (
    <div
      ref={sectionRef}
      className={`transition-all duration-1000 delay-200 ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-10"
      }`}
    >
      <div className="bg-gradient-to-br from-slate-50 to-white rounded-3xl border-2 border-slate-200 p-8 md:p-10 mb-8">
        <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-6">Why Choose Luminum Agency?</h3>

        <div className="space-y-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#302cff] to-[#5b57ff] rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg mb-1">Passion-Driven Team</h4>
              <p className="text-slate-600">
                We genuinely care about your success and treat every project as if it were our own.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#00d9ff] to-[#7cff6b] rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg mb-1">Fast Turnaround</h4>
              <p className="text-slate-600">We deliver quality work on time without compromising on excellence.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-[#b846f5] to-[#ff6b35] rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-lg mb-1">Award-Winning Design</h4>
              <p className="text-slate-600">Our designs don't just look good—they drive results and win recognition.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-slate-200 p-4 text-center hover:shadow-lg transition-shadow duration-300"
            >
              <div className="inline-flex p-2 bg-gradient-to-br from-[#302cff]/10 to-[#00d9ff]/10 rounded-lg mb-2">
                <stat.icon className="w-5 h-5 text-[#302cff]" />
              </div>
              <p className="text-2xl font-black text-[#302cff] mb-1">{stat.value}</p>
              <p className="text-xs font-semibold text-slate-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#302cff] to-[#5b57ff] rounded-3xl p-8 md:p-10 text-white shadow-2xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-lg mb-2">Our Location</h4>
            <p className="text-white/90 leading-relaxed">
              Based in South Africa, serving clients worldwide with exceptional digital solutions.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-lg mb-2">Business Hours</h4>
            <p className="text-white/90 leading-relaxed">
              Monday - Friday: 9:00 AM - 6:00 PM SAST
              <br />
              Weekend: By Appointment
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 relative h-64 rounded-3xl overflow-hidden border-2 border-slate-200">
        <Image src="/contact-team-workspace.jpg" alt="Luminum Agency team workspace" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#302cff]/80 to-transparent flex items-end p-6">
          <p className="text-white font-bold text-lg">Our creative workspace where ideas come to life</p>
        </div>
      </div>
    </div>
  )
}
