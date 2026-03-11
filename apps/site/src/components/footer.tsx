"use client"

import Link from "next/link"
import Image from "next/image"
import { FaInstagram, FaWhatsapp } from "react-icons/fa6"
import { BsTwitterX } from "react-icons/bs"
import { Heart, ArrowRight, Phone, Mail } from "lucide-react"
import { useState, useEffect } from "react"

export default function Footer() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const socialLinks = [
    {
      name: "Instagram",
      icon: FaInstagram,
      href: "https://instagram.com/luminum_agency",
      color: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
      handle: "@luminum_agency",
    },
    {
      name: "WhatsApp",
      icon: FaWhatsapp,
      href: "https://wa.me/27689186043",
      color: "from-[#25D366] to-[#128C7E]",
      handle: "068 918 6043",
    },
    {
      name: "X",
      icon: BsTwitterX,
      href: "https://x.com/luminum_agency",
      color: "from-slate-800 to-slate-900",
      handle: "@luminum_agency",
    },
  ]

  const contactMethods = [
    {
      icon: Phone,
      label: "Call Us",
      value: "068 918 6043",
      href: "tel:0689186043",
    },
    {
      icon: Mail,
      label: "Email",
      value: "contact@luminum.agency",
      href: "mailto:contact@luminum.agency",
    },
  ]

  return (
    <footer className="relative bg-gradient-to-br from-slate-50 via-white to-slate-50 border-t border-slate-200 overflow-hidden">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-gradient-to-br from-[#302cff]/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-to-tl from-[#ff6b35]/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-[#00d9ff]/3 to-transparent rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 md:gap-16">
            {/* Brand section */}
            <div className="lg:col-span-5">
              <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
                <div className="w-12 h-12 relative overflow-hidden rounded-xl">
                  <Image
                    src="/logo.png"
                    alt="Luminum Logo"
                    fill
                    className="object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="flex flex-col leading-none">
                  <span className="text-xl font-extrabold bg-gradient-to-r from-[#302cff] via-[#5b57ff] to-[#302cff] bg-clip-text text-transparent">
                    Luminum
                  </span>
                  <span className="text-xs font-semibold text-slate-500 tracking-wide">AGENCY</span>
                </div>
              </Link>
              <p className="text-slate-600 text-lg leading-relaxed mb-6 max-w-md">
                We're a passionate web design and marketing agency dedicated to helping businesses shine online. Let's
                create something amazing together.
              </p>

              <div className="space-y-3 mb-6">
                {contactMethods.map((method, index) => (
                  <a
                    key={index}
                    href={method.href}
                    className="flex items-center gap-3 text-slate-700 hover:text-[#302cff] transition-colors duration-300 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-[#302cff]/10 to-[#00d9ff]/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <method.icon className="w-5 h-5 text-[#302cff]" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500">{method.label}</div>
                      <div className="text-base font-bold">{method.value}</div>
                    </div>
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-2 text-slate-900">
                <span className="text-base font-medium">Made with</span>
                <Heart className="w-5 h-5 text-[#ff6b35] fill-[#ff6b35] animate-pulse" />
                <span className="text-base font-medium">in South Africa</span>
              </div>
            </div>

            {/* Quick links */}
            <div className="lg:col-span-3">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Quick Links</h3>
              <ul className="space-y-4">
                {[
                  { name: "Home", href: "/" },
                  { name: "Services", href: "/services" },
                  { name: "Contact Us", href: "/contact" },
                ].map((link, index) => (
                  <li key={index}>
                    <Link
                      href={link.href}
                      className="text-slate-600 hover:text-[#302cff] transition-colors duration-300 text-base font-medium inline-flex items-center gap-2 group"
                    >
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -ml-6 group-hover:ml-0 transition-all duration-300" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-4">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Connect With Us</h3>
              <p className="text-slate-600 text-base mb-6 leading-relaxed">
                Follow our journey and stay updated with the latest tips, projects, and behind-the-scenes content!
              </p>
              <div className="space-y-3">
                {socialLinks.map((social, index) => {
                  const Icon = social.icon
                  return (
                    <a
                      key={index}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-200 hover:border-[#302cff] transition-all duration-300 hover:shadow-lg hover:-translate-y-1 bg-white"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 shadow-md bg-gradient-to-br ${social.color}`}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="text-slate-900 font-bold text-base">{social.name}</div>
                        <div className="text-slate-600 text-sm">{social.handle}</div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                    </a>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-200 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-600 text-sm text-center md:text-left">
              © {new Date().getFullYear()} Luminum Agency. All rights reserved. Empowering businesses to shine online.
            </p>
            <div className="flex gap-6">
              <Link
                href="/privacy"
                className="text-slate-600 hover:text-[#302cff] transition-colors text-sm font-medium"
              >
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-slate-600 hover:text-[#302cff] transition-colors text-sm font-medium">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
