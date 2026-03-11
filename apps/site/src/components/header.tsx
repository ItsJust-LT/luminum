"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Menu, X, ArrowRight, Phone } from 'lucide-react'
import { FaWhatsapp } from "react-icons/fa6"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const [hash, setHash] = useState("")

  useEffect(() => {
    setHash(window.location.hash)
    
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    const handleHashChange = () => {
      setHash(window.location.hash)
    }

    window.addEventListener("scroll", handleScroll)
    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [])

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "Contact", path: "/contact" },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-4 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div
          className={`flex items-center justify-between px-6 lg:px-8 py-4 rounded-2xl transition-all duration-300 backdrop-blur-md border ${
            scrolled
              ? "bg-white/95 border-slate-200 shadow-lg"
              : "bg-white/90 border-white/50 shadow-md"
          }`}
        >
          <Link href="/" className="flex items-center gap-3 group" onClick={() => setHash("")}>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#302cff]/10 p-2 transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="Luminum Logo"
                width={44}
                height={44}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-bold text-[#302cff]">
                Luminum
              </span>
              <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">
                Agency
              </span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item, index) => {
              const isActive = 
                (item.path === "/" && pathname === "/" && !hash) ||
                (item.path !== "/" && !item.path.includes("#") && pathname.startsWith(item.path)) ||
                (item.path.includes("#") && pathname + hash === item.path)

              return (
                <Link
                  key={index}
                  href={item.path}
                  onClick={() => {
                    if (item.path.includes("#")) {
                      setHash("#" + item.path.split("#")[1])
                    } else {
                      setHash("")
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl transition-all duration-200 font-semibold text-sm ${
                    isActive 
                      ? "text-[#302cff] bg-[#302cff]/10" 
                      : "text-slate-700 hover:text-[#302cff] hover:bg-slate-50"
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3">
            <Link href="tel:0689186043" className="hidden xl:block">
              <Button
                variant="ghost"
                size="sm"
                className="text-[#302cff] hover:bg-[#302cff]/10 font-semibold rounded-xl"
              >
                <Phone className="h-4 w-4 mr-2" />
                068 918 6043
              </Button>
            </Link>

            <Link href="/contact" className="hidden sm:block">
              <Button className="bg-[#302cff] hover:bg-[#302cff]/90 text-white font-semibold px-6 rounded-xl shadow-sm transition-all duration-200">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <button
              className="lg:hidden p-2.5 rounded-xl hover:bg-slate-100 transition-colors duration-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 text-slate-700" />
              ) : (
                <Menu className="h-5 w-5 text-slate-700" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="fixed top-24 left-4 right-4 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 max-w-md mx-auto">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <p className="text-sm font-semibold text-slate-700">Menu</p>
            </div>

            <nav className="flex flex-col p-3">
              {navItems.map((item, index) => {
                const isActive = 
                  (item.path === "/" && pathname === "/" && !hash) ||
                  (item.path !== "/" && !item.path.includes("#") && pathname.startsWith(item.path)) ||
                  (item.path.includes("#") && pathname + hash === item.path)

                return (
                  <Link
                    key={index}
                    href={item.path}
                    className={`px-5 py-3.5 rounded-xl transition-all duration-200 font-semibold text-base ${
                      isActive
                        ? "bg-[#302cff]/10 text-[#302cff]"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                    onClick={() => {
                      setIsMenuOpen(false)
                      if (item.path.includes("#")) {
                        setHash("#" + item.path.split("#")[1])
                      } else {
                        setHash("")
                      }
                    }}
                  >
                    {item.name}
                  </Link>
                )
              })}

              <div className="pt-4 mt-4 border-t border-slate-200 space-y-3">
                <Link href="tel:0689186043" onClick={() => setIsMenuOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl"
                  >
                    <Phone className="h-4 w-4 mr-3" />
                    068 918 6043
                  </Button>
                </Link>

                <Link href="https://wa.me/27689186043" onClick={() => setIsMenuOpen(false)}>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-green-300 hover:bg-green-50 text-green-600 font-semibold rounded-xl"
                  >
                    <FaWhatsapp className="h-4 w-4 mr-3" />
                    WhatsApp Us
                  </Button>
                </Link>

                <Link href="/contact" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full bg-[#302cff] hover:bg-[#302cff]/90 text-white font-semibold rounded-xl shadow-sm">
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  )
}
