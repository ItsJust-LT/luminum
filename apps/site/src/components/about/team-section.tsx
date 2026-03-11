"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Code,
  Palette,
  TrendingUp,
  Search,
  Smartphone,
  Globe,
  Award,
  Star,
  Crown,
  Trophy,
  Target,
  Rocket,
  Zap,
  Heart,
  Shield,
  CheckCircle,
  Coffee,
  Lightbulb,
  Camera,
} from "lucide-react"

const teamMembers = [
  {
    name: "Sarah Johnson",
    role: "Creative Director",
    speciality: "UI/UX Design & Brand Strategy",
    experience: "8+ years",
    icon: <Palette className="w-6 h-6" />,
    gradient: "from-pink-500 to-purple-600",
    bgGradient: "from-pink-50 to-purple-50",
    skills: ["UI/UX Design", "Brand Strategy", "Creative Direction"],
    badge: { icon: <Crown className="w-3 h-3" />, text: "Creative", color: "bg-pink-500" },
    quote: "Design is not just what it looks like - design is how it works.",
  },
  {
    name: "Michael Chen",
    role: "Lead Developer",
    speciality: "Full-Stack Development & Architecture",
    experience: "10+ years",
    icon: <Code className="w-6 h-6" />,
    gradient: "from-blue-500 to-indigo-600",
    bgGradient: "from-blue-50 to-indigo-50",
    skills: ["React/Next.js", "Node.js", "Cloud Architecture"],
    badge: { icon: <Rocket className="w-3 h-3" />, text: "Tech Lead", color: "bg-blue-500" },
    quote: "Clean code is not written by following a set of rules. It's written by a craftsman.",
  },
  {
    name: "Priya Patel",
    role: "Digital Marketing Strategist",
    speciality: "SEO & Growth Marketing",
    experience: "6+ years",
    icon: <TrendingUp className="w-6 h-6" />,
    gradient: "from-green-500 to-emerald-600",
    bgGradient: "from-green-50 to-emerald-50",
    skills: ["SEO Strategy", "Content Marketing", "Analytics"],
    badge: { icon: <Target className="w-3 h-3" />, text: "Growth", color: "bg-green-500" },
    quote: "Great marketing is about telling authentic stories that resonate.",
  },
  {
    name: "David Williams",
    role: "Project Manager",
    speciality: "Client Relations & Project Delivery",
    experience: "7+ years",
    icon: <Users className="w-6 h-6" />,
    gradient: "from-orange-500 to-red-600",
    bgGradient: "from-orange-50 to-red-50",
    skills: ["Project Management", "Client Relations", "Team Leadership"],
    badge: { icon: <Shield className="w-3 h-3" />, text: "Reliable", color: "bg-orange-500" },
    quote: "Success is the result of preparation, hard work, and learning from failure.",
  },
  {
    name: "Emma Thompson",
    role: "Mobile App Developer",
    speciality: "iOS & Android Development",
    experience: "5+ years",
    icon: <Smartphone className="w-6 h-6" />,
    gradient: "from-indigo-500 to-purple-600",
    bgGradient: "from-indigo-50 to-purple-50",
    skills: ["React Native", "Flutter", "Native Development"],
    badge: { icon: <Zap className="w-3 h-3" />, text: "Mobile", color: "bg-indigo-500" },
    quote: "Mobile is not just a platform, it's a way of life.",
  },
  {
    name: "James Rodriguez",
    role: "SEO Specialist",
    speciality: "Technical SEO & Performance",
    experience: "6+ years",
    icon: <Search className="w-6 h-6" />,
    gradient: "from-cyan-500 to-blue-600",
    bgGradient: "from-cyan-50 to-blue-50",
    skills: ["Technical SEO", "Performance Optimization", "Analytics"],
    badge: { icon: <Trophy className="w-3 h-3" />, text: "Expert", color: "bg-cyan-500" },
    quote: "SEO is not about gaming the system, it's about learning how to play by the rules.",
  },
]

const teamStats = [
  {
    icon: <Award className="w-6 h-6" />,
    value: "50+",
    label: "Combined Years Experience",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: <Star className="w-6 h-6" />,
    value: "15+",
    label: "Industry Certifications",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    icon: <Globe className="w-6 h-6" />,
    value: "3",
    label: "Countries Represented",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: <Coffee className="w-6 h-6" />,
    value: "1000+",
    label: "Cups of Coffee Daily",
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
]

const floatingElements = [
  { icon: <Lightbulb className="w-4 h-4" />, color: "text-yellow-400", delay: 0 },
  { icon: <Heart className="w-3 h-3" />, color: "text-red-400", delay: 2 },
  { icon: <Camera className="w-2 h-2" />, color: "text-blue-300", delay: 1 },
]

export default function TeamSection() {
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

      {/* Floating team icons */}
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
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-blue-600" />
              Meet Our Team
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
              The Brilliant Minds
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
              Behind Your Success
            </motion.span>
          </motion.h2>

          <motion.p
            className="text-base sm:text-lg md:text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed font-medium"
            variants={itemVariants}
          >
            Meet the passionate professionals who bring your digital vision to life. Our diverse team combines
            <motion.span
              className="text-blue-700 font-bold"
              whileInView={{ color: ["#1d4ed8", "#4338ca", "#1d4ed8"] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
            >
              {" "}
              creativity, technical expertise
            </motion.span>
            , and years of experience to deliver exceptional results.
          </motion.p>
        </motion.div>

        {/* Team Members Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 mb-16 sm:mb-20"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {teamMembers.map((member, index) => (
            <motion.div
              key={index}
              className="group relative"
              variants={itemVariants}
              whileHover={{ y: -12, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {/* Member badge */}
              <motion.div
                className={`absolute -top-3 -right-3 ${member.badge.color} text-white rounded-full px-3 py-1 text-xs font-bold flex items-center gap-1 shadow-lg z-20`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                whileHover={{ scale: 1.1 }}
              >
                {member.badge.icon}
                <span className="hidden sm:inline">{member.badge.text}</span>
              </motion.div>

              <div className="bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-xl border border-blue-200/50 hover:shadow-2xl transition-all duration-300 relative overflow-hidden h-full">
                {/* Background gradient */}
                <motion.div
                  className={`absolute inset-0 bg-gradient-to-br ${member.bgGradient} opacity-0 group-hover:opacity-30 transition-opacity duration-300`}
                  animate={{
                    opacity: [0, 0.05, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Number.POSITIVE_INFINITY,
                    delay: index * 1.5,
                  }}
                />

                <div className="relative z-10 text-center space-y-4">
                  {/* Avatar */}
                  <motion.div
                    className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-gradient-to-r ${member.gradient} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
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
                    <div className="text-white">{member.icon}</div>
                  </motion.div>

                  {/* Member info */}
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-800 mb-2 group-hover:text-blue-700 transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-blue-600 font-bold text-sm sm:text-base mb-1">{member.role}</p>
                    <p className="text-slate-600 text-xs sm:text-sm mb-3">{member.speciality}</p>
                    <Badge className="bg-gradient-to-r from-slate-100 to-blue-100 text-slate-800 text-xs font-bold px-3 py-1 border-0 mb-4">
                      {member.experience}
                    </Badge>
                  </div>

                  {/* Skills */}
                  <div className="space-y-2">
                    {member.skills.map((skill, skillIndex) => (
                      <div key={skillIndex} className="flex items-center justify-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                        <span className="text-slate-700 text-xs font-medium">{skill}</span>
                      </div>
                    ))}
                  </div>

                  {/* Quote */}
                  <motion.div
                    className="pt-4 border-t border-slate-200/50"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <p className="text-slate-600 text-xs italic leading-relaxed">"{member.quote}"</p>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Team Stats */}
        <motion.div
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {teamStats.map((stat, index) => (
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
                  delay: index * 2.5,
                }}
              >
                {stat.icon}
              </motion.div>
              <motion.div
                className="text-2xl sm:text-3xl font-black text-slate-800 mb-2"
                whileInView={{
                  scale: [1, 1.1, 1],
                }}
                transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 }}
              >
                {stat.value}
              </motion.div>
              <div className="text-sm sm:text-base text-slate-600 font-bold">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
