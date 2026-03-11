"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  TrendingUp,
  Lightbulb,
  Target,
  Heart,
  Rocket,
  Star,
  CheckCircle,
  Crown,
  Trophy,
  Gem,
  Zap,
  Shield,
} from "lucide-react"

const timeline = [
  {
    year: "2014",
    title: "The Beginning",
    description: "Founded with a vision to help South African businesses succeed online",
    icon: <Lightbulb className="w-6 h-6" />,
    color: "from-blue-500 to-cyan-500",
    achievements: ["First 10 clients", "Basic web design services", "Local Johannesburg focus"],
  },
  {
    year: "2017",
    title: "Rapid Growth",
    description: "Expanded services and team to meet growing demand",
    icon: <TrendingUp className="w-6 h-6" />,
    color: "from-indigo-500 to-purple-500",
    achievements: ["100+ clients served", "E-commerce solutions added", "Team of 8 professionals"],
  },
  {
    year: "2020",
    title: "Digital Transformation",
    description: "Pivoted to help businesses adapt to the digital-first world",
    icon: <Rocket className="w-6 h-6" />,
    color: "from-purple-500 to-pink-500",
    achievements: ["300+ websites launched", "SEO & marketing services", "Remote-first operations"],
  },
  {
    year: "2024",
    title: "Industry Leaders",
    description: "Recognized as one of South Africa's top web agencies",
    icon: <Crown className="w-6 h-6" />,
    color: "from-orange-500 to-red-500",
    achievements: ["500+ happy clients", "Award-winning team", "National recognition"],
  },
]

const values = [
  {
    icon: <Heart className="w-8 h-8" />,
    title: "Client-First Approach",
    description: "Every decision we make is centered around delivering exceptional value to our clients.",
    color: "text-red-600",
    bg: "bg-red-50",
    badge: { icon: <Heart className="w-3 h-3" />, text: "Passion", color: "bg-red-500" },
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: "Results-Driven",
    description: "We measure our success by the tangible results we deliver for your business.",
    color: "text-blue-600",
    bg: "bg-blue-50",
    badge: { icon: <Target className="w-3 h-3" />, text: "Focused", color: "bg-blue-500" },
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: "Innovation",
    description: "We stay ahead of trends and use cutting-edge technology to give you an advantage.",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    badge: { icon: <Zap className="w-3 h-3" />, text: "Innovative", color: "bg-yellow-500" },
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: "Transparency",
    description: "Clear communication, honest pricing, and no hidden surprises - ever.",
    color: "text-green-600",
    bg: "bg-green-50",
    badge: { icon: <Shield className="w-3 h-3" />, text: "Honest", color: "bg-green-500" },
  },
]

const floatingElements = [
  { icon: <Star className="w-4 h-4" />, color: "text-blue-400", delay: 0 },
  { icon: <Gem className="w-3 h-3" />, color: "text-indigo-400", delay: 2 },
  { icon: <Trophy className="w-2 h-2" />, color: "text-blue-300", delay: 1 },
]

export default function OurStory() {
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

      {/* Floating story icons */}
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
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-600" />
              Our Journey
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
              A Decade of
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
              Digital Excellence
            </motion.span>
          </motion.h2>

          <motion.p
            className="text-base sm:text-lg md:text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed font-medium"
            variants={itemVariants}
          >
            From a small startup with big dreams to South Africa's trusted digital partner. Here's how we've grown
            alongside our amazing clients.
          </motion.p>
        </motion.div>

        {/* Timeline */}
        <motion.div
          className="relative mb-16 sm:mb-20"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {/* Timeline line */}
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-indigo-300 to-blue-200 transform sm:-translate-x-1/2"></div>

          <div className="space-y-12 sm:space-y-16">
            {timeline.map((item, index) => (
              <motion.div
                key={index}
                className={`relative flex items-center ${
                  index % 2 === 0 ? "sm:flex-row" : "sm:flex-row-reverse"
                } flex-col sm:flex-row`}
                variants={itemVariants}
              >
                {/* Timeline dot */}
                <motion.div
                  className={`absolute left-4 sm:left-1/2 w-4 h-4 rounded-full bg-gradient-to-r ${item.color} transform sm:-translate-x-1/2 z-10 shadow-lg`}
                  whileHover={{ scale: 1.5 }}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 rgba(59, 130, 246, 0.4)",
                      "0 0 0 10px rgba(59, 130, 246, 0)",
                      "0 0 0 0 rgba(59, 130, 246, 0.4)",
                    ],
                  }}
                  transition={{
                    boxShadow: { duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 },
                  }}
                />

                {/* Content card */}
                <motion.div
                  className={`w-full sm:w-5/12 ml-12 sm:ml-0 ${
                    index % 2 === 0 ? "sm:mr-auto sm:pr-8" : "sm:ml-auto sm:pl-8"
                  }`}
                  whileHover={{ scale: 1.02, y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl border border-blue-200/50 hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                    {/* Background gradient */}
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                      animate={{
                        opacity: [0, 0.02, 0],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: index * 1.5,
                      }}
                    />

                    <div className="relative z-10">
                      {/* Year badge */}
                      <div className="flex items-center justify-between mb-4">
                        <Badge className={`bg-gradient-to-r ${item.color} text-white px-4 py-2 text-lg font-black`}>
                          {item.year}
                        </Badge>
                        <motion.div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center text-white shadow-lg`}
                          animate={{ rotate: [0, 360] }}
                          transition={{
                            duration: 10,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                            delay: index * 2.5,
                          }}
                        >
                          {item.icon}
                        </motion.div>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-3">{item.title}</h3>
                      <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-4">{item.description}</p>

                      {/* Achievements */}
                      <div className="space-y-2">
                        {item.achievements.map((achievement, achIndex) => (
                          <div key={achIndex} className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                            <span className="text-slate-700 text-sm font-medium">{achievement}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Values Section */}
        <motion.div
          className="space-y-12 sm:space-y-16"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.div className="text-center" variants={itemVariants}>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 mb-6">Our Core Values</h3>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              These principles guide everything we do and shape how we serve our clients every day.
            </p>
          </motion.div>

          <motion.div className="grid md:grid-cols-2 gap-6 sm:gap-8" variants={containerVariants}>
            {values.map((value, index) => (
              <motion.div
                key={index}
                className={`p-6 sm:p-8 rounded-2xl ${value.bg} border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group`}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                {/* Value badge */}
                <motion.div
                  className={`absolute -top-2 -right-2 ${value.badge.color} text-white rounded-full px-2 py-1 text-xs font-bold flex items-center gap-1 shadow-lg z-10`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                  whileHover={{ scale: 1.1 }}
                >
                  {value.badge.icon}
                  <span className="hidden sm:inline">{value.badge.text}</span>
                </motion.div>

                {/* Background gradient */}
                <motion.div
                  className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  animate={{
                    opacity: [0, 0.05, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: index * 1.5,
                  }}
                />

                <div className="relative z-10">
                  <motion.div
                    className={`${value.color} mb-4`}
                    animate={{ rotate: [0, 360] }}
                    transition={{
                      duration: 12,
                      repeat: Number.POSITIVE_INFINITY,
                      ease: "linear",
                      delay: index * 3,
                    }}
                  >
                    {value.icon}
                  </motion.div>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-800 mb-3">{value.title}</h4>
                  <p className="text-slate-700 text-sm sm:text-base leading-relaxed">{value.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
