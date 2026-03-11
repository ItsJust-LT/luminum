"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Image from "next/image"

interface PortfolioItemProps {
  title: string
  category: string
  description: string
  image: string
  technologies: string[]
  link?: string
  year?: string
}

export default function PortfolioItem({
  title,
  category,
  description,
  image,
  technologies,
  link = "#",
  year = "2023",
}: PortfolioItemProps) {
  return (
    <motion.div whileHover={{ y: -10 }}>
      <Card className="group overflow-hidden hover:shadow-xl transition-all duration-500 border-0">
        <div className="relative overflow-hidden h-72">
          <Image
            src={image || "/placeholder.svg"}
            alt={title}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          <motion.div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
          >
            <Button className="bg-white text-[#0B22E1] hover:bg-white/90">View Project</Button>
          </motion.div>
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Badge variant="secondary" className="bg-[#0B22E1]/10 text-[#0B22E1]">
              {category}
            </Badge>
            <div className="text-sm text-gray-500">{year}</div>
          </div>
          <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
          <p className="text-gray-600">{description}</p>

          <div className="flex flex-wrap gap-2 pt-2">
            {technologies.map((tech, i) => (
              <Badge key={i} variant="outline" className="bg-gray-50">
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
