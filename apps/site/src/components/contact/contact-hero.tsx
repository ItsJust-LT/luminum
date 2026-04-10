"use client"

import { useEffect, useState } from "react"
import { MessageCircle, Mail, Phone, Clock } from "lucide-react"
import { FaWhatsapp, FaInstagram } from "react-icons/fa6"
import { BsTwitterX } from "react-icons/bs"
import { SITE } from "@/lib/site-copy"

export default function ContactHero() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const quickContacts = [
    {
      icon: FaWhatsapp,
      label: "WhatsApp",
      value: SITE.phoneDisplay,
      href: `https://wa.me/${SITE.phoneTel}`,
      color: "text-green-500",
      bgColor: "bg-green-50",
      hoverColor: "hover:bg-green-100",
    },
    {
      icon: Phone,
      label: "Call Us",
      value: SITE.phoneDisplay,
      href: `tel:${SITE.phoneTel}`,
      color: "text-[#302cff]",
      bgColor: "bg-[#302cff]/5",
      hoverColor: "hover:bg-[#302cff]/10",
    },
    {
      icon: Mail,
      label: "Email",
      value: SITE.email,
      href: `mailto:${SITE.email}`,
      color: "text-[#00d9ff]",
      bgColor: "bg-[#00d9ff]/5",
      hoverColor: "hover:bg-[#00d9ff]/10",
    },
  ]

  const socialLinks = [
    {
      icon: FaInstagram,
      label: "Instagram",
      href: "https://instagram.com/luminum_agency",
      color: "text-pink-500",
    },
    {
      icon: BsTwitterX,
      label: "X",
      href: "https://x.com/luminum_agency",
      color: "text-slate-900",
    },
  ]

  return (
    <section className="relative min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-[#302cff] via-[#5b57ff] to-[#00d9ff] pt-28 pb-20 px-4 md:px-6 overflow-hidden">
      <div
        className="absolute top-20 right-10 w-64 h-64 md:w-96 md:h-96 rounded-full bg-white/20 blur-3xl animate-pulse"
        style={{ animationDuration: "4s" }}
      />
      <div
        className="absolute bottom-20 left-10 w-72 h-72 md:w-[450px] md:h-[450px] rounded-full bg-[#7cff6b]/30 blur-3xl animate-pulse"
        style={{ animationDuration: "5s", animationDelay: "1s" }}
      />

      <div className="relative max-w-7xl mx-auto w-full">
        <div className="text-center mb-12 md:mb-16">
          <div
            className={`transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl border border-white/40 rounded-full px-5 py-2.5 mb-6">
              <MessageCircle className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-bold">Let's Talk</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.1] text-balance">
              Get In Touch
            </h1>

            <p className="text-xl md:text-2xl text-white/95 mb-8 max-w-3xl mx-auto leading-relaxed text-pretty">
              Ready to start your project? Have questions? We're here to help. Choose your preferred way to connect.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
          {quickContacts.map((contact, index) => (
            <a
              key={index}
              href={contact.href}
              className={`group bg-white/95 backdrop-blur-xl rounded-2xl p-6 md:p-8 transition-all duration-500 hover:bg-white hover:scale-105 hover:shadow-2xl ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
              }`}
              style={{
                transitionDelay: `${index * 100 + 200}ms`,
              }}
            >
              <div
                className={`inline-flex p-4 ${contact.bgColor} rounded-xl mb-4 transition-colors duration-300 ${contact.hoverColor}`}
              >
                <contact.icon className={`w-6 h-6 ${contact.color}`} />
              </div>
              <p className="text-sm font-bold text-slate-500 mb-1">{contact.label}</p>
              <p className={`text-lg md:text-xl font-bold ${contact.color}`}>{contact.value}</p>
            </a>
          ))}
        </div>

        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 transition-all duration-1000 delay-500 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <div className="flex items-center gap-2 text-white/90">
            <Clock className="w-5 h-5" />
            <span className="text-sm md:text-base font-semibold">Response within 24 hours</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-white/90 text-sm md:text-base font-semibold">Follow us:</span>
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/20 backdrop-blur-xl hover:bg-white/30 p-3 rounded-xl transition-all duration-300 hover:scale-110"
                aria-label={social.label}
              >
                <social.icon className="w-5 h-5 text-white" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
