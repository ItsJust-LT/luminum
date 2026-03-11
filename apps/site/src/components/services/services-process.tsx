"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle, Lightbulb, Code, Rocket } from "lucide-react"

export default function ServicesProcess() {
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
      icon: MessageCircle,
      title: "Discovery Call",
      description:
        "We start by understanding your vision, goals, and challenges. This is where we align on expectations and explore possibilities together.",
      color: "from-[#302cff] to-[#5b57ff]",
    },
    {
      icon: Lightbulb,
      title: "Strategy & Design",
      description:
        "Our team crafts a tailored strategy and creates stunning designs that reflect your brand's personality and resonate with your audience.",
      color: "from-[#00d9ff] to-[#7cff6b]",
    },
    {
      icon: Code,
      title: "Development & Testing",
      description:
        "We bring designs to life with clean, efficient code. Every feature is thoroughly tested to ensure flawless performance across all devices.",
      color: "from-[#b846f5] to-[#ff6b35]",
    },
    {
      icon: Rocket,
      title: "Launch & Growth",
      description:
        "After a successful launch, we monitor performance, gather insights, and continuously optimize to help your business thrive.",
      color: "from-[#ff6b35] to-[#ffb347]",
    },
  ]

  return (
    <section ref={sectionRef} className="relative bg-white py-20 md:py-32 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div
          className={`text-center mb-16 md:mb-20 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 text-balance">Our Proven Process</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto text-pretty">
            A streamlined approach that transforms your ideas into remarkable digital experiences.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-[#302cff] via-[#00d9ff] via-[#b846f5] to-[#ff6b35]" />

          {steps.map((step, index) => (
            <div
              key={index}
              className={`relative transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: `${index * 150}ms`,
              }}
            >
              <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-transparent hover:shadow-2xl transition-all duration-500 h-full">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${step.color} opacity-0 hover:opacity-5 rounded-2xl transition-opacity duration-500`}
                />

                <div className="relative">
                  <div
                    className={`inline-flex p-5 bg-gradient-to-br ${step.color} rounded-2xl mb-6 shadow-lg relative z-10`}
                  >
                    <step.icon className="w-8 h-8 text-white" />
                  </div>

                  <div className="absolute -top-2 -left-2 w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-50 rounded-full flex items-center justify-center font-black text-2xl text-slate-300 z-0">
                    {index + 1}
                  </div>

                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className="lg:hidden flex justify-center my-4">
                  <div className={`w-1 h-8 bg-gradient-to-b ${step.color} rounded-full`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
