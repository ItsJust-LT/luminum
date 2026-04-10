"use client"

import { useRef, useEffect, useState } from "react"
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Sparkles,
  CheckCircle,
  Clock,
  Shield,
  Award,
  Star,
  Zap,
  Users,
  Target,
  Rocket,
  Globe,
} from "lucide-react"
import SimplifiedContactForm from "@/components/contact/contact-form"

const formFeatures = [
  {
    icon: <CheckCircle className="w-5 h-5" />,
    text: "Free Consultation",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    text: "24h Response Time",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    text: "100% Confidential",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    icon: <Award className="w-5 h-5" />,
    text: "Expert Guidance",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
]

const processSteps = [
  {
    step: "01",
    title: "Submit Your Request",
    description: "Fill out our detailed form with your project requirements and goals.",
    icon: <MessageSquare className="w-6 h-6" />,
    color: "from-blue-500 to-cyan-500",
  },
  {
    step: "02",
    title: "Initial Consultation",
    description: "We'll schedule a call to discuss your vision and provide expert recommendations.",
    icon: <Users className="w-6 h-6" />,
    color: "from-indigo-500 to-purple-500",
  },
  {
    step: "03",
    title: "Proposal & Timeline",
    description: "Receive a detailed proposal with timeline, pricing, and project milestones.",
    icon: <Target className="w-6 h-6" />,
    color: "from-purple-500 to-pink-500",
  },
  {
    step: "04",
    title: "Project Launch",
    description: "Once approved, we begin development with regular updates and communication.",
    icon: <Rocket className="w-6 h-6" />,
    color: "from-blue-600 to-indigo-600",
  },
]

const floatingElements = [
  { icon: <Star className="w-4 h-4" />, color: "text-blue-400", delay: 0 },
  { icon: <Zap className="w-3 h-3" />, color: "text-indigo-400", delay: 2 },
  { icon: <Globe className="w-2 h-2" />, color: "text-blue-300", delay: 1 },
]

export default function ContactFormSection() {
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
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  }

  const floatingVariants = {
    animate: {
      y: [-8, 8, -8],
      x: [-4, 4, -4],
      rotate: [0, 360],
      transition: {
        y: { duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" as const },
        x: { duration: 6, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" as const },
        rotate: { duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "linear" as const },
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

      {/* Multiple animated gradient layers */}
      <div className="absolute inset-0 opacity-40">
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(circle_at_25%_75%,rgba(59,130,246,0.08),transparent_50%)]"
          animate={{
            background: [
              "radial-gradient(circle at 25% 75%, rgba(59,130,246,0.08), transparent 50%)",
              "radial-gradient(circle at 75% 25%, rgba(59,130,246,0.08), transparent 50%)",
              "radial-gradient(circle at 25% 75%, rgba(59,130,246,0.08), transparent 50%)",
            ],
          }}
          transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 bg-[radial-gradient(circle_at_75%_25%,rgba(99,102,241,0.06),transparent_60%)]"
          animate={{
            background: [
              "radial-gradient(circle at 75% 25%, rgba(99,102,241,0.06), transparent 60%)",
              "radial-gradient(circle at 25% 75%, rgba(99,102,241,0.06), transparent 60%)",
              "radial-gradient(circle at 75% 25%, rgba(99,102,241,0.06), transparent 60%)",
            ],
          }}
          transition={{ duration: 25, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 5 }}
        />
      </div>

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

      <motion.div
        className="absolute w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72 rounded-full opacity-10 blur-2xl"
        style={{
          background: "radial-gradient(circle, rgba(147,197,253,0.3) 0%, rgba(59,130,246,0.2) 50%, transparent 70%)",
          x: useTransform(mouseXSpring, [0, 100], [30, -30]),
          y: useTransform(mouseYSpring, [0, 100], [15, -15]),
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          delay: 3,
        }}
      />

      {/* Floating elements */}
      {floatingElements.map((element, index) => (
        <motion.div
          key={index}
          className={`absolute hidden lg:block ${element.color}`}
          style={{
            top: `${20 + index * 20}%`,
            right: `${5 + index * 8}%`,
          }}
          variants={floatingVariants}
          animate="animate"
          transition={{ delay: element.delay }}
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
              Start Your Project
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
              Tell Us About
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
              Your Vision
            </motion.span>
          </motion.h2>

          <motion.p
            className="text-base sm:text-lg md:text-xl text-slate-700 max-w-3xl mx-auto leading-relaxed font-medium mb-8 sm:mb-12"
            variants={itemVariants}
          >
            Ready to transform your digital presence? Fill out our form below and let's start building something
            <motion.span
              className="text-blue-700 font-bold"
              whileInView={{ color: ["#1d4ed8", "#4338ca", "#1d4ed8"] }}
              transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
            >
              {" "}
              extraordinary
            </motion.span>{" "}
            together.
          </motion.p>

          {/* Form features */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 sm:gap-4 lg:gap-6 mb-12 sm:mb-16"
            variants={itemVariants}
          >
            {formFeatures.map((feature, index) => (
              <motion.div
                key={index}
                className={`flex items-center gap-2 sm:gap-3 ${feature.bg} backdrop-blur-sm rounded-xl sm:rounded-2xl px-3 sm:px-4 lg:px-5 py-2 sm:py-3 border border-blue-200/50 shadow-lg`}
                whileHover={{
                  scale: 1.05,
                  y: -3,
                  boxShadow: "0 20px 25px -5px rgba(59, 130, 246, 0.1), 0 10px 10px -5px rgba(59, 130, 246, 0.04)",
                }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: [
                    "0 4px 6px -1px rgba(59, 130, 246, 0.1)",
                    "0 10px 15px -3px rgba(59, 130, 246, 0.1)",
                    "0 4px 6px -1px rgba(59, 130, 246, 0.1)",
                  ],
                }}
                transition={{
                  boxShadow: { duration: 4, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 },
                }}
              >
                <motion.span
                  className={feature.color}
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear", delay: index * 2 }}
                >
                  {feature.icon}
                </motion.span>
                <span className="text-slate-800 text-xs sm:text-sm font-bold">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Contact Form */}
          <motion.div variants={itemVariants} initial="hidden" animate={isInView ? "visible" : "hidden"}>
            <SimplifiedContactForm />
          </motion.div>

          {/* Process Steps */}
          <motion.div
            className="space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <motion.div variants={itemVariants}>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-800 mb-6">Our Process</h3>
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed mb-8">
                Here's how we turn your vision into reality through our proven 4-step process.
              </p>
            </motion.div>

            <motion.div className="space-y-6" variants={containerVariants}>
              {processSteps.map((step, index) => (
                <motion.div
                  key={index}
                  className="flex items-start space-x-4 p-6 rounded-2xl bg-white/90 backdrop-blur-sm shadow-lg border border-blue-200/50 hover:shadow-xl transition-all duration-300 group"
                  variants={itemVariants}
                  whileHover={{ x: 5, scale: 1.02 }}
                >
                  <div className="flex-shrink-0">
                    <motion.div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-r ${step.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow duration-300`}
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
                      <div className="text-white">{step.icon}</div>
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        {step.step}
                      </span>
                      <h4 className="text-lg sm:text-xl font-black text-slate-800 group-hover:text-blue-700 transition-colors">
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              className="p-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50"
              variants={itemVariants}
            >
              <div className="flex items-center space-x-3 mb-3">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-slate-800">What Happens Next?</h4>
              </div>
              <p className="text-slate-600 text-sm">
                After submitting your form, you'll receive a confirmation email within minutes. Our team will review
                your requirements and contact you within 24 hours to schedule your free consultation call.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
