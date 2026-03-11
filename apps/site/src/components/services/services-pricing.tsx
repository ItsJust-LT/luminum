"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Star, Zap, Crown, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function ServicesPricing() {
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

  const plans = [
    {
      icon: Zap,
      name: "Starter",
      price: "From R5,999",
      description: "Perfect for small businesses and startups looking to establish their online presence.",
      features: [
        "5-Page Website",
        "Mobile Responsive Design",
        "Basic SEO Setup",
        "Contact Form Integration",
        "Social Media Links",
        "1 Month Support",
      ],
      color: "from-[#00d9ff] to-[#7cff6b]",
      popular: false,
    },
    {
      icon: Star,
      name: "Professional",
      price: "From R12,999",
      description: "Ideal for growing businesses that need advanced features and comprehensive marketing.",
      features: [
        "10-Page Website",
        "Custom Design & Branding",
        "Advanced SEO Optimization",
        "E-Commerce Integration (up to 50 products)",
        "Social Media Marketing Setup",
        "Analytics & Reporting",
        "3 Months Support",
        "Priority Response",
      ],
      color: "from-[#302cff] to-[#5b57ff]",
      popular: true,
    },
    {
      icon: Crown,
      name: "Enterprise",
      price: "Custom Quote",
      description: "Complete digital solutions for established businesses ready to dominate their market.",
      features: [
        "Unlimited Pages",
        "Fully Custom Development",
        "Advanced E-Commerce (Unlimited products)",
        "Comprehensive Marketing Campaign",
        "Brand Strategy & Consulting",
        "Dedicated Account Manager",
        "12 Months Premium Support",
        "Monthly Strategy Sessions",
      ],
      color: "from-[#b846f5] to-[#ff6b35]",
      popular: false,
    },
  ]

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="relative bg-gradient-to-br from-slate-50 to-white py-20 md:py-32 px-4 md:px-6"
    >
      <div className="max-w-7xl mx-auto">
        <div
          className={`text-center mb-16 md:mb-20 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#302cff]/10 to-[#00d9ff]/10 backdrop-blur-sm border border-[#302cff]/20 rounded-full px-5 py-2.5 mb-6">
            <Star className="w-4 h-4 text-[#302cff]" />
            <span className="text-[#302cff] text-sm font-bold">Transparent Pricing</span>
          </div>

          <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 text-balance">Choose Your Perfect Plan</h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto text-pretty">
            Flexible packages designed to fit your budget and goals. Every plan includes our signature quality and
            dedicated support.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 md:gap-10">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-3xl border-2 p-8 md:p-10 transition-all duration-700 hover:shadow-2xl hover:-translate-y-2 ${
                plan.popular ? "border-[#302cff] lg:scale-105" : "border-slate-200"
              } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
              style={{
                transitionDelay: `${index * 150}ms`,
              }}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#302cff] to-[#5b57ff] text-white text-sm font-bold px-6 py-2 rounded-full shadow-lg">
                  Most Popular
                </div>
              )}

              <div className={`inline-flex p-4 bg-gradient-to-br ${plan.color} rounded-2xl mb-6`}>
                <plan.icon className="w-8 h-8 text-white" />
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">{plan.name}</h3>
              <p
                className={`text-4xl md:text-5xl font-black bg-gradient-to-r ${plan.color} bg-clip-text text-transparent mb-4`}
              >
                {plan.price}
              </p>
              <p className="text-slate-600 mb-8 leading-relaxed">{plan.description}</p>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center mt-0.5`}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-slate-700 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href="/contact" className="block">
                <Button
                  size="lg"
                  className={`w-full font-bold text-base py-6 h-auto rounded-xl shadow-lg group ${
                    plan.popular
                      ? "bg-gradient-to-r from-[#302cff] to-[#5b57ff] hover:from-[#2820dd] hover:to-[#4a46ee] text-white shadow-[#302cff]/30"
                      : "bg-slate-900 hover:bg-slate-800 text-white"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    Get Started
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <div
          className={`mt-16 text-center transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <p className="text-slate-600 text-lg mb-4">Need something custom? We've got you covered.</p>
          <Link href="/contact">
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-[#302cff]/30 text-[#302cff] hover:bg-[#302cff]/5 font-bold text-base px-8 py-6 h-auto rounded-xl bg-transparent"
            >
              Request Custom Quote
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
