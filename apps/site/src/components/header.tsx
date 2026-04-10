"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Menu, X, ArrowRight, Phone } from "lucide-react"
import { FaWhatsapp } from "react-icons/fa6"
import { EASE_OUT } from "@/lib/motion"
import { SITE } from "@/lib/site-copy"

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const [hash, setHash] = useState("")
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    setHash(window.location.hash)

    const handleScroll = () => {
      setScrolled(window.scrollY > 12)
    }

    const handleHashChange = () => {
      setHash(window.location.hash)
    }

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("hashchange", handleHashChange)

    return () => {
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [])

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isMenuOpen])

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "About", path: "/about" },
    { name: "Blog", path: "/blog" },
    { name: "Contact", path: "/contact" },
  ]

  const menuTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: EASE_OUT }

  const overlayTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.22 }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-[max(0.75rem,env(safe-area-inset-top))] px-3 sm:px-4 md:px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 sm:px-6 sm:py-3.5 backdrop-blur-xl transition-shadow duration-300 ${
            scrolled
              ? "border-slate-200/80 bg-white/92 shadow-lg shadow-slate-900/6"
              : "border-white/60 bg-white/85 shadow-md shadow-slate-900/5"
          }`}
          initial={false}
          layout
        >
          <Link
            href="/"
            className="flex min-h-[44px] min-w-[44px] items-center gap-3 group -ml-1"
            onClick={() => setHash("")}
          >
            <motion.div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#302cff]/10 p-2 sm:h-11 sm:w-11"
              whileHover={reduceMotion ? {} : { scale: 1.06 }}
              whileTap={reduceMotion ? {} : { scale: 0.97 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
            >
              <Image
                src="/logo.png"
                alt="Luminum Logo"
                width={44}
                height={44}
                className="object-contain"
                priority
              />
            </motion.div>
            <div className="flex flex-col leading-tight">
              <span className="font-heading text-lg font-bold tracking-tight text-[#302cff] sm:text-xl">
                Luminum
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Agency
              </span>
            </div>
          </Link>

          <nav
            className="hidden items-center gap-0.5 lg:flex"
            aria-label="Primary"
          >
            {navItems.map((item) => {
              const isActive =
                (item.path === "/" && pathname === "/" && !hash) ||
                (item.path !== "/" &&
                  !item.path.includes("#") &&
                  pathname.startsWith(item.path)) ||
                (item.path.includes("#") && pathname + hash === item.path)

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => {
                    if (item.path.includes("#")) {
                      setHash("#" + item.path.split("#")[1])
                    } else {
                      setHash("")
                    }
                  }}
                  className={`relative rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "text-[#302cff]"
                      : "text-slate-700 hover:text-[#302cff]"
                  }`}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-xl bg-[#302cff]/10"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                      }}
                    />
                  ) : null}
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="tel:0689186043" className="hidden xl:block">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 rounded-xl font-semibold text-[#302cff] hover:bg-[#302cff]/10"
              >
                <Phone className="mr-2 h-4 w-4" />
                068 918 6043
              </Button>
            </Link>

            <Link href="/contact" className="hidden sm:block">
              <motion.div
                whileHover={reduceMotion ? {} : { scale: 1.02 }}
                whileTap={reduceMotion ? {} : { scale: 0.98 }}
              >
                <Button className="h-10 rounded-xl bg-[#302cff] px-5 font-semibold text-white shadow-md shadow-[#302cff]/25 transition-shadow hover:bg-[#2820dd] hover:shadow-lg sm:h-11 sm:px-6">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </Link>

            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isMenuOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              className="fixed inset-0 z-40 cursor-default bg-slate-900/25 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={overlayTransition}
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              id="mobile-navigation"
              className="fixed left-3 right-3 top-[calc(4.25rem+env(safe-area-inset-top))] z-50 mx-auto max-h-[min(78dvh,calc(100dvh-5.5rem))] max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/15 lg:hidden"
              initial={
                reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.98 }
              }
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={
                reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.98 }
              }
              transition={menuTransition}
            >
              <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
                <p className="text-sm font-semibold text-slate-800">Menu</p>
              </div>

              <nav className="flex flex-col gap-0.5 p-2" aria-label="Mobile primary">
                {navItems.map((item, index) => {
                  const isActive =
                    (item.path === "/" && pathname === "/" && !hash) ||
                    (item.path !== "/" &&
                      !item.path.includes("#") &&
                      pathname.startsWith(item.path)) ||
                    (item.path.includes("#") && pathname + hash === item.path)

                  return (
                    <motion.div
                      key={item.path}
                      initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        ...menuTransition,
                        delay: reduceMotion ? 0 : index * 0.04,
                      }}
                    >
                      <Link
                        href={item.path}
                        className={`flex min-h-[48px] items-center rounded-xl px-4 text-base font-semibold ${
                          isActive
                            ? "bg-[#302cff]/10 text-[#302cff]"
                            : "text-slate-800 hover:bg-slate-50"
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
                    </motion.div>
                  )
                })}

                <div className="mt-3 space-y-2 border-t border-slate-100 pt-4">
                  <Link href={`tel:${SITE.phoneTel}`} onClick={() => setIsMenuOpen(false)}>
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-start rounded-xl border-slate-200 font-semibold"
                    >
                      <Phone className="mr-3 h-4 w-4" />
                      {SITE.phoneDisplay}
                    </Button>
                  </Link>

                  <Link
                    href={`https://wa.me/${SITE.phoneTel}`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      className="h-12 w-full justify-start rounded-xl border-green-200 font-semibold text-green-700 hover:bg-green-50"
                    >
                      <FaWhatsapp className="mr-3 h-4 w-4" />
                      WhatsApp
                    </Button>
                  </Link>

                  <Link href="/contact" onClick={() => setIsMenuOpen(false)}>
                    <Button className="h-12 w-full rounded-xl bg-[#302cff] font-semibold text-white hover:bg-[#2820dd]">
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </nav>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
