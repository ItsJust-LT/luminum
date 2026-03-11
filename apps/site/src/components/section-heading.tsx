"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

interface SectionHeadingProps {
  badge?: string
  title: string
  description?: string
  center?: boolean
  className?: string
  titleClassName?: string
  descriptionClassName?: string
  light?: boolean
}

export default function SectionHeading({
  badge,
  title,
  description,
  center = false,
  className = "",
  titleClassName = "",
  descriptionClassName = "",
  light = false,
}: SectionHeadingProps) {
  return (
    <motion.div
      className={`space-y-4 ${center ? "text-center mx-auto" : ""} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
    >
      {badge && (
        <Badge
          className={
            light ? "bg-white/10 text-white border-white/20" : "bg-[#0B22E1]/10 text-[#0B22E1] border-[#0B22E1]/20"
          }
        >
          {badge}
        </Badge>
      )}
      <h2
        className={`text-3xl md:text-4xl lg:text-5xl font-bold ${light ? "text-white" : "text-gray-900"} ${titleClassName}`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`text-lg ${light ? "text-blue-100" : "text-gray-600"} max-w-3xl ${center ? "mx-auto" : ""} ${descriptionClassName}`}
        >
          {description}
        </p>
      )}
    </motion.div>
  )
}
