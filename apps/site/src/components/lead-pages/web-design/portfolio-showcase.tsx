"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { ExternalLink } from "lucide-react"
import Image from "next/image"

export function PortfolioShowcase() {
  const portfolioItems = [
    {
      title: "Beauty Salon Website",
      category: "Service Business",
      image: "/portfolio-beauty-salon.jpg",
      description: "Modern booking system with online appointments",
      features: ["Online Booking", "Gallery", "Contact Forms"],
    },
    {
      title: "E-commerce Store",
      category: "Online Shop",
      image: "/portfolio-ecommerce-store.jpg",
      description: "Full online store with payment integration",
      features: ["Product Catalog", "Shopping Cart", "Payments"],
    },
    {
      title: "Restaurant Website",
      category: "Food & Beverage",
      image: "/portfolio-restaurant.jpg",
      description: "Menu showcase with online ordering",
      features: ["Digital Menu", "Online Orders", "Location Map"],
    },
    {
      title: "Business One-Pager",
      category: "Professional Services",
      image: "/portfolio-business-onepager.jpg",
      description: "Clean professional presence with lead forms",
      features: ["Service Pages", "Contact Forms", "Testimonials"],
    },
    {
      title: "Fitness Studio",
      category: "Health & Fitness",
      image: "/portfolio-fitness-studio.jpg",
      description: "Class schedules and membership info",
      features: ["Class Booking", "Trainer Profiles", "Pricing"],
    },
    {
      title: "Construction Company",
      category: "Trade Services",
      image: "/portfolio-construction.jpg",
      description: "Project portfolio with quote requests",
      features: ["Project Gallery", "Quote Forms", "Services"],
    },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Recent Website Projects</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            See how we've helped South African businesses establish their online presence
          </p>
        </motion.div>

        {/* Portfolio Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {portfolioItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
            >
              <div className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
                {/* Image */}
                <div className="relative overflow-hidden">
                  <Image
                    src={item.image || "/placeholder.svg"}
                    alt={item.title}
                    width={400}
                    height={300}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <Badge variant="secondary" className="mb-3 text-xs">
                    {item.category}
                  </Badge>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 mb-4 text-sm">{item.description}</p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2">
                    {item.features.map((feature, featureIndex) => (
                      <span
                        key={featureIndex}
                        className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-lg text-gray-600 mb-6">Ready to join these successful businesses?</p>
          <button
            onClick={() => document.getElementById("quote-form")?.scrollIntoView({ behavior: "smooth" })}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-300"
          >
            Get Your Free Quote Now
          </button>
        </motion.div>
      </div>
    </section>
  )
}
