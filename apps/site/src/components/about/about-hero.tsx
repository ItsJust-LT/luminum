"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  ArrowRight,
  Star,
  Users,
  Award,
  Globe,
  Heart,
  Target,
  Rocket,
  Sparkles,
  Crown,
  Medal,
  Trophy,
  Gem,
  Shield,
  CheckCircle,
  TrendingUp,
  Calendar,
  MapPin,
} from "lucide-react"

const achievements = [
  {
    value: "10+",
    label: "Years Experience",
    icon: <Calendar className="w-6 h-6 sm:w-7 sm:h-7" />,
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-50 to-cyan-50",
    badge: { icon: <Crown className="w-3 h-3" />, text: "Veteran", color: "bg-blue-500" },
  },
  {
    value: "500+",
    label: "Happy Clients",
    icon: <Users className="w-6 h-6 sm:w-7 sm:h-7" />,
    gradient: "from-indigo-500 to-purple-500",
    bgGradient: "from-indigo-50 to-purple-50",
    badge: { icon: <Heart className="w-3 h-3" />, text: "Loved", color: "bg-indigo-500" },
  },
  {
    value: "1000+",
    label: "Projects Completed",
    icon: <Award className="w-6 h-6 sm:w-7 sm:h-7" />,
    gradient: "from-green-500 to-emerald-500",
    bgGradient: "from-green-50 to-emerald-50",
    badge: { icon: <Trophy className="w-3 h-3" />, text: "Winner", color: "bg-green-500" },
  },
  {
    value: "99.8%",
    label: "Success Rate",
    icon: <Target className="w-6 h-6 sm:w-7 sm:h-7" />,
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-50 to-red-50",
    badge: { icon: <Medal className="w-3 h-3" />, text: "Excellence", color: "bg-orange-500" },
  },
]

const floatingElements = [
  { icon: <Star className="w-6 h-6" />, color: "text-blue-500", delay: 0 },
  { icon: <Rocket className="w-5 h-5" />, color: "text-indigo-500", delay: 2 },
  { icon: <Globe className="w-4 h-4" />, color: "text-blue-600", delay: 1 },
  { icon: <Gem className="w-3 h-3" />, color: "text-indigo-400", delay: 3 },
]

export default function AboutHero() {
  const heroRef = useRef(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const isInView = useInView(heroRef, { once: true, amount: 0.2 })

  const { scrollYProgress } = useScroll()
  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, -100])

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

  const floatingVariants = {
    animate: {
      y: [-15, 15, -15],
      x: [-10, 10, -10],
      rotate: [0, 360],
      transition: {
        y: { duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
        x: { duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
        rotate: { duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
      },
    },
  }

  return (
    <section
      ref={heroRef}
      className="relative pt-24 sm:pt-28 lg:pt-32 pb-16 sm:pb-20 lg:pb-24 overflow-hidden bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/50"
    >
      {/* Enhanced responsive background */}
      <motion.div
        className="absolute inset-0"
        style={{
          y: backgroundY,
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.08) 40%, rgba(147,197,253,0.05) 70%, transparent 100%)`,
        }}
      />

      {/* Multiple animated gradient layers */}
      <div className="absolute inset-0 opacity-60">
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(circle_at_25%_75%,rgba(59,130,246,0.12),transparent_50%)]"
          animate={{
            background: [
              "radial-gradient(circle at 25% 75%, rgba(59,130,246,0.12), transparent 50%)",
              "radial-gradient(circle at 75% 25%, rgba(59,130,246,0.12), transparent 50%)",
              "radial-gradient(circle at 25% 75%, rgba(59,130,246,0.12), transparent 50%)",
            ],
          }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(99,102,241,0.08),transparent_60%)]"
          animate={{
            background: [
              "radial-gradient(circle at 75% 25%, rgba(99,102,241,0.08), transparent 60%)",
              "radial-gradient(circle at 25% 75%, rgba(99,102,241,0.08), transparent 60%)",
              "radial-gradient(circle at 75% 25%, rgba(99,102,241,0.08), transparent 60%)",
            ],
          }}
          transition={{ duration: 25, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 5 }}
        />
      </div>

      {/* Enhanced floating orbs */}
      <motion.div
        className="absolute w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96 rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(99,102,241,0.3) 40%, transparent 70%)",
          x: useTransform(mouseXSpring, [0, 100], [-60, 60]),
          y: useTransform(mouseYSpring, [0, 100], [-40, 40]),
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 8,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-full opacity-15 blur-2xl"
        style={{
          background: "radial-gradient(circle, rgba(147,197,253,0.4) 0%, rgba(59,130,246,0.3) 50%, transparent 70%)",
          x: useTransform(mouseXSpring, [0, 100], [40, -40]),
          y: useTransform(mouseYSpring, [0, 100], [20, -20]),
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 10,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          delay: 3,
        }}
      />

      {/* Floating geometric shapes */}
      <motion.div
        className="absolute top-1/4 right-1/4 w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 border-2 border-blue-200/60 rounded-2xl backdrop-blur-sm"
        variants={floatingVariants}
        animate="animate"
        style={{
          background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.1))",
        }}
      />
      <motion.div
        className="absolute bottom-1/3 left-1/5 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full backdrop-blur-sm border border-indigo-200/60"
        variants={floatingVariants}
        animate="animate"
        transition={{ delay: 2 }}
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(147,197,253,0.15))",
        }}
      />

      {/* Enhanced sparkle effects */}
      {[...Array(10)].map((_, i) => (
        <motion.div
          key={i}
          className={`absolute w-1 h-1 sm:w-2 sm:h-2 bg-blue-400 rounded-full`}
          style={{
            top: `${20 + i * 8}%`,
            left: `${10 + i * 8}%`,
          }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 3,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: i * 0.5,
          }}
        />
      ))}

      {/* Floating about icons */}
      {floatingElements.map((element, index) => (
        <motion.div
          key={index}
          className={`absolute hidden lg:block ${element.color}`}
          style={{
            top: `${25 + index * 15}%`,
            right: `${5 + index * 8}%`,
          }}
          animate={{
            y: [-12, 12, -12],
            rotate: [0, 360],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            y: { duration: 5 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
            rotate: { duration: 15 + index * 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" },
            opacity: { duration: 3 + index, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" },
            delay: element.delay,
          }}
        >
          {element.icon}
        </motion.div>
      ))}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content Section */}
          <motion.div
            className="space-y-8 sm:space-y-12"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            {/* Badge */}
            <motion.div variants={itemVariants} className="flex justify-start">
              <Badge className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-300/50 px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-bold backdrop-blur-sm shadow-lg">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-600" />
                About Luminum Agency
              </Badge>
            </motion.div>

            {/* Hero headline */}
            <motion.div className="space-y-6 sm:space-y-8">
              <motion.h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[0.9] tracking-tight"
                variants={itemVariants}
              >
                <motion.span
                  className="block text-slate-800 mb-3 sm:mb-4"
                  whileInView={{
                    color: ["#1e293b", "#1d4ed8", "#1e293b"],
                  }}
                  transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
                >
                  We Are Digital
                </motion.span>
                <motion.span
                  className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent mb-3 sm:mb-4"
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
                  Innovators
                </motion.span>
              </motion.h1>

              <motion.p
                className="text-lg sm:text-xl md:text-2xl text-slate-700 leading-relaxed max-w-3xl font-medium"
                variants={itemVariants}
              >
                For over a decade, we've been
                <motion.span
                  className="text-blue-700 font-bold"
                  whileInView={{ color: ["#1d4ed8", "#4338ca", "#1d4ed8"] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
                >
                  {" "}
                  transforming businesses
                </motion.span>{" "}
                across South Africa with cutting-edge web solutions. From humble beginnings to becoming a
                <motion.span
                  className="text-indigo-700 font-bold"
                  whileInView={{ color: ["#4338ca", "#0ea5e9", "#4338ca"] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, delay: 1.5 }}
                >
                  {" "}
                  leading digital agency
                </motion.span>
                , our passion for excellence drives everything we do.
              </motion.p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div className="flex flex-col sm:flex-row gap-4 sm:gap-6" variants={itemVariants}>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Link href="/contact">
                  <Button
                    size="lg"
                    className="bg-blue-600 text-white hover:bg-blue-700 shadow-2xl px-6 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 text-sm sm:text-base lg:text-lg font-bold w-full sm:w-auto group border-0"
                  >
                    <Users className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                    Meet Our Team
                    <ArrowRight className="ml-2 sm:ml-3 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 group-hover:translate-x-1 sm:group-hover:translate-x-2 transition-transform duration-300" />
                  </Button>
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}>
                <Link href="/services">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 hover:border-blue-700 px-6 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 text-sm sm:text-base lg:text-lg font-bold w-full sm:w-auto backdrop-blur-sm bg-white"
                  >
                    <Globe className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                    Our Services
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Location info */}
            <motion.div
              className="flex items-center space-x-3 text-slate-600"
              variants={itemVariants}
              whileInView={{
                color: ["rgba(71,85,105,1)", "rgba(29,78,216,1)", "rgba(71,85,105,1)"],
              }}
              transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY }}
            >
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="text-sm sm:text-base font-medium">
                Proudly serving businesses across South Africa from our Johannesburg headquarters
              </span>
            </motion.div>
          </motion.div>

          {/* Visual Section */}
          <motion.div
            className="relative"
            variants={itemVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            {/* Main team image placeholder */}
            <motion.div
              className="relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/50 p-8"
              whileHover={{ scale: 1.02, rotateY: 3 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="text-center space-y-6">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <Users className="w-16 h-16 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">Our Amazing Team</h3>
                  <p className="text-slate-600">20+ passionate professionals dedicated to your success</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center"
                      whileHover={{ scale: 1.1 }}
                      animate={{
                        scale: [1, 1.05, 1],
                      }}
                      transition={{
                        scale: { duration: 2, repeat: Number.POSITIVE_INFINITY, delay: i * 0.3 },
                      }}
                    >
                      <Users className="w-6 h-6 text-slate-600" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Floating achievement cards */}
            <div className="absolute -right-4 -top-4 space-y-3">
              <motion.div
                className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/50 max-w-48"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                whileHover={{ scale: 1.05, x: -5 }}
              >
                <div className="flex items-center space-x-3">
                  <Award className="w-8 h-8 text-blue-600" />
                  <div>
                    <div className="font-bold text-slate-800">Award Winning</div>
                    <div className="text-xs text-slate-600">Top Agency 2023</div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/50 max-w-48"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.0 }}
                whileHover={{ scale: 1.05, x: -5 }}
              >
                <div className="flex items-center space-x-3">
                  <Shield className="w-8 h-8 text-green-600" />
                  <div>
                    <div className="font-bold text-slate-800">Certified Team</div>
                    <div className="text-xs text-slate-600">Industry Experts</div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="absolute -left-4 -bottom-4 space-y-3">
              <motion.div
                className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/50 max-w-48"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 }}
                whileHover={{ scale: 1.05, x: 5 }}
              >
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                  <div>
                    <div className="font-bold text-slate-800">Growing Fast</div>
                    <div className="text-xs text-slate-600">200% YoY Growth</div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                className="bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-white/50 max-w-48"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4 }}
                whileHover={{ scale: 1.05, x: 5 }}
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                  <div>
                    <div className="font-bold text-slate-800">Trusted Choice</div>
                    <div className="text-xs text-slate-600">500+ Happy Clients</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Achievement stats */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 pt-16 sm:pt-20 lg:pt-24 max-w-5xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {achievements.map((stat, index) => (
            <motion.div
              key={index}
              className="text-center group cursor-pointer relative"
              variants={itemVariants}
              whileHover={{ y: -10, scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Badge */}
              <motion.div
                className={`absolute -top-2 -right-2 ${stat.badge.color} text-white rounded-full px-2 py-1 text-xs font-bold flex items-center gap-1 shadow-lg z-10`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.1 }}
              >
                {stat.badge.icon}
                <span className="hidden sm:inline">{stat.badge.text}</span>
              </motion.div>

              <motion.div
                className={`inline-flex p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r ${stat.bgGradient} border ${stat.gradient.replace("from-", "border-").replace(" to-", "-200/50 border-")} shadow-lg mb-4 sm:mb-5 group-hover:shadow-xl transition-all duration-300`}
                whileHover={{
                  boxShadow: "0 25px 50px -12px rgba(59, 130, 246, 0.25)",
                }}
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
                <motion.span
                  className={`bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}
                  animate={{ rotate: [0, 360] }}
                  transition={{
                    duration: 12,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "linear",
                    delay: index * 3,
                  }}
                >
                  {stat.icon}
                </motion.span>
              </motion.div>
              <motion.div
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-800 mb-2 group-hover:text-blue-700 transition-colors"
                whileInView={{
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 }}
              >
                {stat.value}
              </motion.div>
              <div className="text-sm sm:text-base text-slate-600 font-bold group-hover:text-slate-800 transition-colors">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-16 sm:h-24 lg:h-32 bg-gradient-to-t from-white via-blue-50/50 to-transparent"
        animate={{
          background: [
            "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(239,246,255,0.5) 50%, transparent 100%)",
            "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(238,242,255,0.5) 50%, transparent 100%)",
            "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(239,246,255,0.5) 50%, transparent 100%)",
          ],
        }}
        transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
    </section>
  )
}
