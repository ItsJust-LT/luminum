"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  Heart,
  Shield,
  Zap,
  Target,
  Users,
  Lightbulb,
  Globe,
  CheckCircle,
  Star,
  Sparkles,
  Trophy,
  Gem,
  Coffee,
} from "lucide-react"

const coreValues = [
  {
    icon: <Heart className="w-10 h-10 sm:w-12 sm:h-12" />,
    title: "Client-Centric Passion",
    description:
      "Every decision we make starts with one question: How does this benefit our clients? Your success is our success.",
    features: [
      "24/7 support availability",
      "Dedicated account managers",
      "Regular progress updates",
      "Transparent communication",
    ],
    gradient: "from-red-500 to-pink-600",
    bgGradient: "from-red-50 to-pink-50",
    badge: { icon: <Heart className="w-3 h-3" />, text: "Passion", color: "bg-red-500" },
    stats: { value: "98%", label: "Client Satisfaction" },
  },
  {
    icon: <Shield className="w-10 h-10 sm:w-12 sm:h-12" />,
    title: "Uncompromising Quality",
    description:
      "We never cut corners. Every project receives our full attention to detail and commitment to excellence.",
    features: [
      "Rigorous testing processes",
      "Code review standards",
      "Performance optimization",
      "Security best practices",
    ],
    gradient: "from-blue-500 to-indigo-600",
    bgGradient: "from-blue-50 to-indigo-50",
    badge: { icon: <Shield className="w-3 h-3" />, text: "Quality", color: "bg-blue-500" },
    stats: { value: "99.9%", label: "Uptime Guarantee" },
  },
  {
    icon: <Zap className="w-10 h-10 sm:w-12 sm:h-12" />,
    title: "Innovation & Speed",
    description:
      "We embrace cutting-edge technology and agile methodologies to deliver results faster than the competition.",
    features: ["Latest tech stack", "Agile development", "Rapid prototyping", "Continuous improvement"],
    gradient: "from-yellow-500 to-orange-600",
    bgGradient: "from-yellow-50 to-orange-50",
    badge: { icon: <Zap className="w-3 h-3" />, text: "Fast", color: "bg-yellow-500" },
    stats: { value: "2 weeks", label: "Average Delivery" },
  },
  {
    icon: <Target className="w-10 h-10 sm:w-12 sm:h-12" />,
    title: "Results-Driven Focus",
    description:
      "We measure our success by your business growth. Every strategy is designed to deliver measurable results.",
    features: ["ROI-focused strategies", "Performance tracking", "Data-driven decisions", "Growth optimization"],
    gradient: "from-green-500 to-emerald-600",
    bgGradient: "from-green-50 to-emerald-50",
    badge: { icon: <Target className="w-3 h-3" />, text: "Results", color: "bg-green-500" },
    stats: { value: "300%", label: "Average ROI Increase" },
  },
]

const companyPrinciples = [
  {
    icon: <Lightbulb className="w-6 h-6" />,
    title: "Continuous Learning",
    description: "We invest in our team's growth and stay ahead of industry trends.",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Collaborative Spirit",
    description: "We believe the best solutions come from diverse perspectives working together.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Global Mindset",
    description: "We think globally while acting locally, bringing world-class solutions to South Africa.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: <Coffee className="w-6 h-6" />,
    title: "Work-Life Balance",
    description: "Happy teams create better work. We prioritize well-being and creativity.",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
]

const floatingElements = [
  { icon: <Star className="w-4 h-4" />, color: "text-blue-400", delay: 0 },
  { icon: <Gem className="w-3 h-3" />, color: "text-indigo-400", delay: 2 },
  { icon: <Trophy className="w-2 h-2" />, color: "text-blue-300", delay: 1 },
]

export default function CompanyValues() {
  const sectionRef = useRef(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 })

  const { scrollYProgress } = useScroll()
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, -60])

  // Enhanced mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const springConfig = { damping: 25, stiffness: 300 }
  const mouseXSpring = useSpring(mouseX, springConfig)
  const mouseYSpring = useSpring(mouseY, springConfig)

  useEffect(() => {
    mouseX.set(mousePosition.x)
    mouseY.set(mousePosition.y)
  }, [mousePosition, mouseX, mouseY])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.7,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  }

  return (
    <section
      ref={sectionRef}
      className="relative py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-slate-50 via-white to-blue-50/80 overflow-hidden"
    >
      {/* Enhanced background */}
      <motion.div
        className="absolute inset-0"
        style={{
          y: backgroundY,
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.04) 40%, rgba(147,197,253,0.02) 70%, transparent 100%)`,
        }}
      />

      {/* Floating orbs */}
      <motion.div
        className="absolute w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-full opacity-10 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(99,102,241,0.2) 40%, transparent 70%)",
          x: useTransform(mouseXSpring, [0, 100], [-40, 40]),
          y: useTransform(mouseYSpring, [0, 100], [-30, 30]),
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 8,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Floating values icons */}
      {floatingElements.map((element, index) => (
        <motion.div
          key={index}
          className={`absolute hidden lg:block ${element.color}`}
          style={{
            top: `${15 + index * 20}%`,
            right: `${2 + index * 8}%`,
          }}
          animate={{
            y: [-6, 6, -6],
            rotate: [0, 360],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            y: { duration: 4 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
            rotate: { duration: 12 + index * 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            opacity: { duration: 3 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
            delay: element.delay,
          }}
        >
          {element.icon}
        </motion.div>
      ))}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16 sm:mb-20"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.div variants={itemVariants} className="flex justify-center">
            <Badge className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-300/50 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold backdrop-blur-sm shadow-lg mb-6 sm:mb-8">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-600" />
              Our Values
            </Badge>
          </motion.div>

          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-6 sm:mb-8 tracking-tight"
            variants={itemVariants}
          >
            <motion.span
              className="block text-slate-800 mb-2 sm:mb-4"
              whileInView={{
                color: ["#1e293b", "#1d4ed8", "#1e293b"],
              }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
            >
              What Drives Us
            </motion.span>
            <motion.span
              className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 6,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
              style={{
                backgroundSize: "200% 200%",
              }}
            >
              Every Single Day
            </motion.span>
          </motion.h2>

          <motion.p
            className="text-base sm:text-lg md:text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed font-medium"
            variants={itemVariants}
          >
            These core values aren't just words on a wall - they're the foundation of how we work, how we treat our
            clients, and how we measure our success.
          </motion.p>
        </motion.div>

        {/* Core Values Grid */}
        <motion.div
          className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-16 sm:mb-20"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {coreValues.map((value, index) => (
            <motion.div
              key={index}
              className="group relative"
              variants={itemVariants}
              whileHover={{ y: -12, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Value badge */}
              <motion.div
                className={`absolute -top-3 -right-3 ${value.badge.color} text-white rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 shadow-lg z-20`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.1 }}
              >
                {value.badge.icon}
                <span className="hidden sm:inline">{value.badge.text}</span>
              </motion.div>

              <div className="bg-white/95 backdrop-blur-sm p-8 sm:p-10 rounded-2xl shadow-xl border border-blue-200/50 hover:shadow-2xl transition-all duration-300 relative overflow-hidden h-full">
                {/* Background gradient */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${value.bgGradient} opacity-0 group-hover:opacity-30 transition-opacity duration-300`}
                  animate={{
                    opacity: [0, 0.05, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: index * 1.5,
                  }}
                />

                <div className="relative z-10 space-y-6">
                  {/* Icon and stats */}
                  <div className="flex items-start justify-between">
                    <motion.div
                      className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-r ${value.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      animate={{
                        boxShadow: [
                          "0 4px 6px -1px rgba(59, 130, 246, 0.1)",
                          "0 10px 15px -3px rgba(59, 130, 246, 0.1)",
                          "0 4px 6px -1px rgba(59, 130, 246, 0.1)",
                        ],
                      }}
                      transition={{
                        boxShadow: { duration: 3, repeat: Number.POSITIVE_INFINITY, delay: index * 0.7 },
                      }}
                    >
                      <div className="text-white">{value.icon}</div>
                    </motion.div>

                    <div className="text-right">
                      <motion.div
                        className="text-2xl sm:text-3xl font-black text-slate-800"
                        whileInView={{
                          scale: [1, 1.1, 1],
                        }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 }}
                      >
                        {value.stats.value}
                      </motion.div>
                      <div className="text-sm text-slate-600 font-bold">{value.stats.label}</div>
                    </div>
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-4 group-hover:text-blue-700 transition-colors">
                      {value.title}
                    </h3>
                    <p className="text-slate-700 text-base sm:text-lg leading-relaxed mb-6">{value.description}</p>

                    {/* Features */}
                    <div className="space-y-3">
                      {value.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <span className="text-slate-700 text-sm font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Company Principles */}
        <motion.div
          className="space-y-12"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.div className="text-center" variants={itemVariants}>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 mb-6">How We Work</h3>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              These principles guide our daily operations and shape our company culture.
            </p>
          </motion.div>

          <motion.div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8" variants={containerVariants}>
            {companyPrinciples.map((principle, index) => (
              <motion.div
                key={index}
                className={`p-6 sm:p-8 rounded-2xl ${principle.bg} border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 text-center`}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <motion.div
                  className={`${principle.color} mb-4 flex justify-center`}
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 10,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                    delay: index * 2.5,
                  }}
                >
                  {principle.icon}
                </motion.div>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mb-3">{principle.title}</h4>
                <p className="text-slate-700 text-sm sm:text-base leading-relaxed">{principle.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
