"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, MessageCircle, CheckCircle, Star, Clock, Shield, Zap } from "lucide-react"
import { SITE } from "@/lib/site-copy"

export function FinalCTA() {
  const scrollToForm = () => {
    document.getElementById("quote-form")?.scrollIntoView({ behavior: "smooth" })
  }

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${SITE.phoneTel}?text=Hi%20I%27m%20ready%20to%20build%20my%20professional%20website%20with%20Luminum%20Agency`,
      "_blank",
    )
  }

  const benefits = [
    { icon: Clock, text: "7-day delivery guarantee", color: "text-blue-500" },
    { icon: CheckCircle, text: "Mobile-optimized design", color: "text-green-500" },
    { icon: Shield, text: "Full source code ownership", color: "text-purple-500" },
    { icon: Star, text: "Professional hosting included", color: "text-yellow-500" },
    { icon: MessageCircle, text: "Local SA support team", color: "text-indigo-500" },
    { icon: Zap, text: "Free consultation included", color: "text-orange-500" },
  ]

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.1, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 4,
          }}
        />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          {/* Header */}
          <div className="mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="mb-6"
            >
              <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full border border-white/30 mb-6">
                <Star className="w-4 h-4 text-yellow-400 mr-2 fill-current" />
                <span className="text-white font-medium text-sm">
                  {SITE.stats.projectsDelivered} {SITE.statLabels.projectsDelivered.toLowerCase()}
                </span>
              </div>
            </motion.div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Ready to Build Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
                Dream Website?
              </span>
            </h2>

            <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
              Join South African businesses who chose professional development over templates. Get started
              today and be online in just 7 days with full source code ownership!
            </p>
          </div>

          {/* Benefits Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                viewport={{ once: true }}
                className="flex items-center bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all duration-300 group"
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <benefit.icon
                  className={`w-6 h-6 ${benefit.color} mr-3 flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
                />
                <span className="text-white font-medium text-sm lg:text-base">{benefit.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={scrollToForm}
                size="lg"
                className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-6 text-lg font-bold rounded-xl shadow-2xl hover:shadow-white/25 transition-all duration-300 group w-full sm:w-auto min-w-[280px]"
              >
                <Zap className="mr-2 h-6 w-6 text-orange-500" />
                Get Your Free Quote Now
                <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={openWhatsApp}
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-6 text-lg font-bold rounded-xl shadow-2xl hover:shadow-white/25 transition-all duration-300 group w-full sm:w-auto bg-transparent min-w-[280px]"
              >
                <MessageCircle className="mr-2 h-6 w-6" />
                Chat on WhatsApp
              </Button>
            </motion.div>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* Rating */}
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-blue-100 font-semibold">
                {SITE.stats.clientRating} · {SITE.stats.projectsDelivered}{" "}
                {SITE.statLabels.projectsDelivered.toLowerCase()}
              </span>
            </div>

            {/* Final Trust Elements */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 max-w-4xl mx-auto">
              <div className="grid sm:grid-cols-3 gap-6 text-center">
                <div className="space-y-2">
                  <div className="text-3xl">⚡</div>
                  <div className="text-white font-bold">2-Hour Response</div>
                  <div className="text-blue-200 text-sm">We'll contact you fast</div>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl">🇿🇦</div>
                  <div className="text-white font-bold">Local SA Team</div>
                  <div className="text-blue-200 text-sm">Based in South Africa</div>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl">🚀</div>
                  <div className="text-white font-bold">Launch in 7 Days</div>
                  <div className="text-blue-200 text-sm">Guaranteed delivery</div>
                </div>
              </div>
            </div>

            {/* Urgency */}
            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-xl">
              <Clock className="w-5 h-5 text-white mr-2" />
              <span className="text-white font-bold text-sm">
                Only 3 development slots remaining this month - Secure yours today!
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
