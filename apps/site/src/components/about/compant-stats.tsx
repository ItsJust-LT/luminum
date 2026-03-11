"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Users,
  Award,
  Globe,
  Clock,
  Star,
  CheckCircle,
  Zap,
  Heart,
  Shield,
  Rocket,
  Trophy,
  Medal,
  Crown,
  Gem,
  Calendar,
  Coffee,
} from "lucide-react"

const mainStats = [
  {
    icon: <Users className="w-8 h-8 sm:w-10 sm:h-10" />,
    value: "500+",
    label: "Happy Clients",
    description: "Businesses we've helped grow online",
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
    badge: { icon: <Heart className="w-3 h-3" />, text: "Loved", color: "bg-blue-500" },
    growth: "+200% this year",
  },
  {
    icon: <Award className="w-8 h-8 sm:w-10 sm:h-10" />,
    value: "1000+",
    label: "Projects Completed",
    description: "Successful digital solutions delivered",
    gradient: "from-indigo-500 to-purple-500",
    bgGradient: "from-indigo-50 to-purple-50",
    badge: { icon: <Trophy className="w-3 h-3" />, text: "Winner", color: "bg-indigo-500" },
    growth: "+150% growth",
  },
  {
    icon: <Star className="w-8 h-8 sm:w-10 sm:h-10" />,
    value: "4.9/5",
    label: "Client Rating",
    description: "Average satisfaction score",
    gradient: "from-yellow-500 to-orange-500",
    bgGradient: "from-yellow-50 to-orange-50",
    badge: { icon: <Star className="w-3 h-3" />, text: "Rated", color: "bg-yellow-500" },
    growth: "Consistently high",
  },
  {
    icon: <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10" />,
    value: "98%",
    label: "Success Rate",
    description: "Projects delivered on time & budget",
    gradient: "from-green-500 to-emerald-500",
    bgGradient: "from-green-50 to-emerald-50",
    badge: { icon: <CheckCircle className="w-3 h-3" />, text: "Success", color: "bg-green-500" },
    growth: "Industry leading",
  },
]

const additionalStats = [
  {
    icon: <Calendar className="w-6 h-6" />,
    value: "10+",
    label: "Years Experience",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    value: "3",
    label: "Countries Served",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    icon: <Clock className="w-6 h-6" />,
    value: "24/7",
    label: "Support Available",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    value: "2 weeks",
    label: "Average Delivery",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    value: "100%",
    label: "Satisfaction Guarantee",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    icon: <Coffee className="w-6 h-6" />,
    value: "1000+",
    label: "Cups of Coffee",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
]

const achievements = [
  {
    year: "2023",
    title: "Top Web Agency Award",
    description: "Recognized as South Africa's leading web development company",
    icon: <Crown className="w-6 h-6" />,
    color: "text-yellow-600",
  },
  {
    year: "2022",
    title: "Best E-commerce Solutions",
    description: "Excellence in online store development and optimization",
    icon: <Medal className="w-6 h-6" />,
    color: "text-blue-600",
  },
  {
    year: "2021",
    title: "Innovation in Digital Marketing",
    description: "Outstanding results in SEO and digital marketing campaigns",
    icon: <Rocket className="w-6 h-6" />,
    color: "text-green-600",
  },
  {
    year: "2020",
    title: "Client Choice Award",
    description: "Highest client satisfaction rating in the industry",
    icon: <Heart className="w-6 h-6" />,
    color: "text-red-600",
  },
]

const floatingElements = [
  { icon: <Trophy className="w-4 h-4" />, color: "text-yellow-400", delay: 0 },
  { icon: <Gem className="w-3 h-3" />, color: "text-blue-400", delay: 2 },
  { icon: <Medal className="w-2 h-2" />, color: "text-indigo-300", delay: 1 },
]

export default function CompanyStats() {
  const sectionRef = useRef(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 })

  const { scrollYProgress } = useScroll()
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, -80])

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
      className="relative py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50 overflow-hidden"
    >
      {/* Enhanced background */}
      <motion.div
        className="absolute inset-0"
        style={{
          y: backgroundY,
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(59,130,246,0.10) 0%, rgba(99,102,241,0.05) 40%, rgba(147,197,253,0.03) 70%, transparent 100%)`,
        }}
      />

      {/* Floating orbs */}
      <motion.div
        className="absolute w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-full opacity-12 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(99,102,241,0.2) 40%, transparent 70%)",
          x: useTransform(mouseXSpring, [0, 100], [-40, 40]),
          y: useTransform(mouseYSpring, [0, 100], [-30, 30]),
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.12, 0.22, 0.12],
        }}
        transition={{
          duration: 8,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      {/* Floating stats icons */}
      {floatingElements.map((element, index) => (
        <motion.div
          key={index}
          className={`absolute hidden lg:block ${element.color}`}
          style={{
            top: `${20 + index * 20}%`,
            right: `${3 + index * 8}%`,
          }}
          animate={{
            y: [-8, 8, -8],
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
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-600" />
              Our Impact
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
              Numbers That Tell
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
              Our Story
            </motion.span>
          </motion.h2>

          <motion.p
            className="text-base sm:text-lg md:text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed font-medium"
            variants={itemVariants}
          >
            A decade of growth, innovation, and client success. These numbers represent real businesses transformed and
            dreams made digital.
          </motion.p>
        </motion.div>

        {/* Main Stats Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 mb-16 sm:mb-20"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {mainStats.map((stat, index) => (
            <motion.div
              key={index}
              className="group relative"
              variants={itemVariants}
              whileHover={{ y: -12, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Stat badge */}
              <motion.div
                className={`absolute -top-3 -right-3 ${stat.badge.color} text-white rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 shadow-lg z-20`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.1 }}
              >
                {stat.badge.icon}
                <span className="hidden sm:inline">{stat.badge.text}</span>
              </motion.div>

              <div className="bg-white/95 backdrop-blur-sm p-8 sm:p-10 rounded-2xl shadow-xl border border-blue-200/50 hover:shadow-2xl transition-all duration-300 relative overflow-hidden h-full text-center">
                {/* Background gradient */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-0 group-hover:opacity-30 transition-opacity duration-300`}
                  animate={{
                    opacity: [0, 0.05, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: index * 1.5,
                  }}
                />

                <div className="relative z-10 space-y-4">
                  {/* Icon */}
                  <motion.div
                    className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-gradient-to-r ${stat.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
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
                    <div className="text-white">{stat.icon}</div>
                  </motion.div>

                  {/* Value */}
                  <motion.div
                    className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-800 group-hover:text-blue-700 transition-colors"
                    whileInView={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 }}
                  >
                    {stat.value}
                  </motion.div>

                  {/* Label and description */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-800 mb-2">{stat.label}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-3">{stat.description}</p>
                    <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 text-xs font-bold px-3 py-1 border-0">
                      {stat.growth}
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Additional Stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8 mb-16 sm:mb-20"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {additionalStats.map((stat, index) => (
            <motion.div
              key={index}
              className={`text-center p-6 sm:p-8 rounded-2xl ${stat.bg} border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300`}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <motion.div
                className={`${stat.color} mb-4 flex justify-center`}
                animate={{ rotate: [0, 360] }}
                transition={{
                  duration: 10,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                  delay: index * 1.5,
                }}
              >
                {stat.icon}
              </motion.div>
              <motion.div
                className="text-xl sm:text-2xl font-black text-slate-800 mb-2"
                whileInView={{
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.3 }}
              >
                {stat.value}
              </motion.div>
              <div className="text-xs sm:text-sm text-slate-600 font-bold">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Awards & Achievements */}
        <motion.div
          className="space-y-12"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <motion.div className="text-center" variants={itemVariants}>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-800 mb-6">Awards & Recognition</h3>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Industry recognition for our commitment to excellence and innovation.
            </p>
          </motion.div>

          <motion.div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8" variants={containerVariants}>
            {achievements.map((achievement, index) => (
              <motion.div
                key={index}
                className="bg-white/90 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg border border-blue-200/50 hover:shadow-xl transition-all duration-300 text-center group"
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <motion.div
                  className={`${achievement.color} mb-4 flex justify-center`}
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 12,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                    delay: index * 3,
                  }}
                >
                  {achievement.icon}
                </motion.div>
                <Badge className="bg-gradient-to-r from-slate-100 to-blue-100 text-slate-800 text-xs font-bold px-3 py-1 border-0 mb-3">
                  {achievement.year}
                </Badge>
                <h4 className="text-lg sm:text-xl font-black text-slate-800 mb-3 group-hover:text-blue-700 transition-colors">
                  {achievement.title}
                </h4>
                <p className="text-slate-600 text-sm leading-relaxed">{achievement.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
