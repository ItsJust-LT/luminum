"use client"

import { useEffect, useRef, useState } from "react"
import { Code, Megaphone, Palette, Search, ShoppingCart, Zap, Globe, TrendingUp, Users } from "lucide-react"

export default function ServicesGrid() {
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

  const services = [
    {
      icon: Code,
      title: "Web Development",
      description:
        "Custom websites and web applications built with cutting-edge technologies for optimal performance and user experience.",
      color: "from-[#302cff] to-[#5b57ff]",
      features: ["Responsive Design", "Fast Loading", "SEO Optimized", "Secure & Scalable"],
    },
    {
      icon: Palette,
      title: "UI/UX Design",
      description:
        "Beautiful, intuitive interfaces that delight users and drive engagement. We craft experiences that convert.",
      color: "from-[#ff6b35] to-[#ff8c61]",
      features: ["User Research", "Wireframing", "Prototyping", "Visual Design"],
    },
    {
      icon: Megaphone,
      title: "Digital Marketing",
      description:
        "Strategic campaigns that amplify your brand's voice and reach your target audience across all digital channels.",
      color: "from-[#00d9ff] to-[#00f5d4]",
      features: ["Social Media", "Content Strategy", "Email Marketing", "Analytics"],
    },
    {
      icon: Search,
      title: "SEO Services",
      description:
        "Dominate search rankings with our proven SEO strategies. Get found by customers actively searching for your services.",
      color: "from-[#7cff6b] to-[#a0ff8c]",
      features: ["Keyword Research", "On-Page SEO", "Link Building", "Local SEO"],
    },
    {
      icon: ShoppingCart,
      title: "E-Commerce Solutions",
      description:
        "Complete online store solutions that turn browsers into buyers. Sell more with optimized shopping experiences.",
      color: "from-[#b846f5] to-[#d46fff]",
      features: ["Store Setup", "Payment Integration", "Inventory Management", "Conversion Optimization"],
    },
    {
      icon: Globe,
      title: "Brand Identity",
      description:
        "Memorable brand identities that stand out in crowded markets. We create visual stories that resonate.",
      color: "from-[#ff6b35] to-[#ffb347]",
      features: ["Logo Design", "Brand Guidelines", "Color Schemes", "Typography"],
    },
    {
      icon: TrendingUp,
      title: "Growth Strategy",
      description:
        "Data-driven strategies to scale your business. We identify opportunities and execute for measurable growth.",
      color: "from-[#302cff] to-[#00d9ff]",
      features: ["Market Analysis", "Competitor Research", "Growth Hacking", "Performance Tracking"],
    },
    {
      icon: Users,
      title: "Social Media Management",
      description:
        "Build engaged communities around your brand. We handle everything from content creation to community engagement.",
      color: "from-[#00d9ff] to-[#7cff6b]",
      features: ["Content Creation", "Community Management", "Influencer Outreach", "Ad Campaigns"],
    },
    {
      icon: Zap,
      title: "Website Maintenance",
      description:
        "Keep your website running smoothly with regular updates, security patches, and performance optimization.",
      color: "from-[#ffb347] to-[#ff6b35]",
      features: ["Security Updates", "Performance Monitoring", "Content Updates", "Technical Support"],
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
          <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 text-balance">
            Comprehensive Digital Solutions
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto text-pretty">
            Everything you need to succeed online, delivered by passionate experts who care about your success.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {services.map((service, index) => (
            <div
              key={index}
              className={`group relative bg-white rounded-2xl border-2 border-slate-200 p-8 transition-all duration-700 hover:border-transparent hover:shadow-2xl hover:-translate-y-2 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: `${index * 100}ms`,
              }}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-500`}
              />

              <div className="relative">
                <div className={`inline-flex p-4 bg-gradient-to-br ${service.color} rounded-xl mb-6 shadow-lg`}>
                  <service.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-4">{service.title}</h3>
                <p className="text-slate-600 mb-6 leading-relaxed">{service.description}</p>

                <div className="space-y-2">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${service.color}`} />
                      <span className="font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`absolute top-4 right-4 w-24 h-24 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-10 rounded-full blur-2xl transition-opacity duration-500`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
