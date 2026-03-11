"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, ChevronRight } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

interface ServiceCardProps {
  title: string
  description: string
  icon: ReactNode
  features: string[]
  color: string
  link: string
}

export default function ServiceCard({ title, description, icon, features, color, link }: ServiceCardProps) {
  return (
    <motion.div whileHover={{ y: -10, transition: { duration: 0.2 } }}>
      <Card className="h-full group hover:shadow-xl transition-all duration-300 border-gray-100 hover:border-[#0B22E1]/20 overflow-hidden">
        <CardContent className="p-8 text-center space-y-6 relative">
          <motion.div
            className={`w-20 h-20 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center mx-auto shadow-lg`}
            whileHover={{
              rotate: [0, 10, -10, 0],
              transition: { duration: 0.5 },
            }}
          >
            <div className="text-white">{icon}</div>
          </motion.div>
          <div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">{title}</h3>
            <p className="text-gray-600">{description}</p>
          </div>
          <ul className="space-y-2 text-left">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center text-gray-700">
                <ChevronRight className="h-4 w-4 text-[#0B22E1] mr-2 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="pt-4">
            <Link href={link}>
              <Button variant="ghost" className="text-[#0B22E1] hover:bg-[#0B22E1]/5 group-hover:bg-[#0B22E1]/10">
                Learn More
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>

          {/* Decorative elements */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br from-[#0B22E1]/5 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
