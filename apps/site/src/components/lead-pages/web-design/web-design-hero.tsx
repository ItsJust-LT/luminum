"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, MessageCircle, Star, CheckCircle, Sparkles } from 'lucide-react'
import Image from "next/image"
import { SITE } from "@/lib/site-copy"

export function WebDesignHero() {
  const scrollToForm = () => {
    document.getElementById("quote-form")?.scrollIntoView({ behavior: "smooth" })
  }

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${SITE.phoneTel}?text=Hi%20I%27m%20interested%20in%20Luminum%20Agency%27s%20professional%20web%20development%20service`,
      "_blank",
    )
  }

  return (
    <section className="relative min-h-screen bg-white">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(148_163_184)_1px,transparent_0)] bg-[length:24px_24px] opacity-[0.02]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="text-center">
          {/* Logo and Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex items-center justify-center mb-4">
              <Image src="/logo.png" alt="Luminum Agency Logo" width={48} height={48} className="mr-3" />
              <div className="text-left">
                <h3 className="text-xl font-bold text-gray-900">Luminum Agency</h3>
                <p className="text-sm text-blue-600 font-medium">Professional Web Development</p>
              </div>
            </div>
            <Badge className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-lg">
              <Star className="w-4 h-4 mr-2 fill-current" />
              {SITE.stats.projectsDelivered} {SITE.statLabels.projectsDelivered} · Premium development
            </Badge>
          </motion.div>

          {/* Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              Get a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Professional Website
              </span>
              <br />
              <span className="text-2xl sm:text-3xl lg:text-4xl text-gray-700 font-medium">
                That Actually Grows Your Business
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Custom-developed by Luminum Agency with full source code ownership.{" "}
              <span className="font-semibold text-gray-900">No templates. No limitations.</span>
            </p>
          </motion.div>

          {/* Pricing Cards with OR Divider */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="max-w-5xl mx-auto mb-12"
          >
            <div className="grid md:grid-cols-2 gap-8 relative">
              {/* Pay Upfront Card */}
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Pay Upfront</h3>
                  <div className="text-3xl font-bold text-blue-600 mb-2">From R1,999</div>
                  <p className="text-gray-600 mb-3">+ R200/month hosting & support</p>
                  <div className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium">
                    💰 Save R1,200+ over 12 months
                  </div>
                </div>
              </motion.div>

              {/* OR Divider */}
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 hidden md:block">
                <div className="bg-white border-2 border-gray-300 rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
                  <span className="text-gray-600 font-bold text-sm">OR</span>
                </div>
              </div>

              {/* Mobile OR Divider */}
              <div className="flex items-center justify-center md:hidden">
                <div className="flex-1 h-px bg-gray-300"></div>
                <div className="bg-white border-2 border-gray-300 rounded-full w-10 h-10 flex items-center justify-center mx-4 shadow-lg">
                  <span className="text-gray-600 font-bold text-xs">OR</span>
                </div>
                <div className="flex-1 h-px bg-gray-300"></div>
              </div>

              {/* Monthly Plan Card */}
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-500 text-white text-xs">Popular</Badge>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Monthly Plan</h3>
                  <div className="text-3xl font-bold text-green-600 mb-2">From R399/month</div>
                  <p className="text-gray-600 mb-3">for 12 months (all inclusive)</p>
                  <div className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium">
                    ⭐ Start immediately - No large upfront cost
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto"
          >
            {[
              { icon: CheckCircle, text: "7-Day Delivery" },
              { icon: CheckCircle, text: "Full Source Code" },
              { icon: CheckCircle, text: "Mobile Optimized" },
              { icon: CheckCircle, text: "Flexible Payments" },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                className="flex items-center justify-center bg-gray-50 px-4 py-3 rounded-xl border border-gray-200"
              >
                <item.icon className="w-5 h-5 text-green-500 mr-2" />
                <span className="font-medium text-gray-700 text-sm">{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={scrollToForm}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group w-full sm:w-auto"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Get Your Free Quote
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={openWhatsApp}
                variant="outline"
                size="lg"
                className="border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto bg-transparent"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                WhatsApp Us Now
              </Button>
            </motion.div>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-gray-700 font-medium">
                {SITE.stats.clientRating} · {SITE.stats.projectsDelivered}{" "}
                {SITE.statLabels.projectsDelivered.toLowerCase()}
              </span>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 max-w-3xl mx-auto">
              <div className="grid sm:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">⚡</div>
                  <p className="text-sm text-gray-700 font-medium">Only 3 slots left this month</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">💬</div>
                  <p className="text-sm text-gray-700 font-medium">Free consultation included</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-indigo-600">🚀</div>
                  <p className="text-sm text-gray-700 font-medium">Launch in 7 days</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
