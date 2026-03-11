"use client"

import { motion, AnimatePresence } from "framer-motion"
import { X } from "lucide-react"
import { useState, useEffect } from "react"
import { FaWhatsapp } from "react-icons/fa"
import { trackWhatsAppClick } from "@/lib/gtm"

export function FloatingWhatsApp() {
  const [isVisible, setIsVisible] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  // Show tooltip only once after a longer delay, then auto-hide
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setShowTooltip(true)
    }, 8000) // Wait 8 seconds before showing

    const hideTimer = setTimeout(() => {
      setShowTooltip(false)
    }, 18000) // Auto-hide after 10 seconds of showing

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  const openWhatsApp = () => {
    trackWhatsAppClick()
    setShowTooltip(false)
    window.open(
      "https://wa.me/27689186043?text=Hi%20I%27m%20interested%20in%20Luminum%20Agency%27s%20professional%20web%20development%20service",
      "_blank",
    )
  }

  if (!isVisible) return null

  return (
    <>
      {/* Subtle pulsing ring - only one, less frequent */}
      <motion.div
        className="fixed bottom-6 right-6 z-30 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 3 }}
      >
        <motion.div
          className="absolute inset-0 border-2 border-green-400/30 rounded-full"
          animate={{
            scale: [1, 1.8, 1.8],
            opacity: [0.5, 0.1, 0],
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeOut",
          }}
          style={{
            width: "64px",
            height: "64px",
          }}
        />
      </motion.div>

      {/* Main floating button - cleaner, less animated */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 25,
          delay: 2,
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={openWhatsApp}
          className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          <FaWhatsapp className="w-6 h-6" />
        </button>
      </motion.div>

      {/* Simple, clean tooltip - shows once, less intrusive */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="fixed bottom-20 right-6 z-40 max-w-xs"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 relative">
              {/* Simple close button */}
              <button
                onClick={() => setShowTooltip(false)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-gray-500 hover:bg-gray-600 text-white rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Speech bubble tail */}
              <div className="absolute bottom-0 right-8 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white transform translate-y-full" />

              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <FaWhatsapp className="text-white text-lg" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 text-sm mb-1">Need help?</div>
                  <p className="text-gray-600 text-sm mb-3">
                    Chat with us for instant answers about your website project.
                  </p>
                  <button
                    onClick={openWhatsApp}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 w-full"
                  >
                    Start Chat
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
