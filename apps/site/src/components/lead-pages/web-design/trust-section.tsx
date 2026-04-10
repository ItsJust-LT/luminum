"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Star, Users, Clock, Award, Shield, CheckCircle } from "lucide-react"
import Image from "next/image"
import { SITE } from "@/lib/site-copy"

export function TrustSection() {
  const stats = [
    { icon: Users, value: SITE.stats.projectsDelivered, label: SITE.statLabels.projectsDelivered, color: "text-blue-600", bg: "bg-blue-50" },
    { icon: Clock, value: "7 Days", label: "Average Delivery", color: "text-green-600", bg: "bg-green-50" },
    { icon: Award, value: SITE.stats.clientRating, label: SITE.statLabels.clientRating, color: "text-yellow-600", bg: "bg-yellow-50" },
    { icon: Shield, value: "100%", label: "Source Code Owned", color: "text-purple-600", bg: "bg-purple-50" },
  ]

  const testimonials = [
    {
      text: "Luminum transformed our online presence completely. Within 2 weeks of launching, we saw a 300% increase in online inquiries. The monthly payment plan made it so easy to get started!",
      author: "Sarah Chen",
      business: "Cape Town Dental Practice",
      rating: 5,
      result: "300% more inquiries",
    },
    {
      text: "Best investment we've made for our business. The custom e-commerce site they built generates R50,000+ monthly. Having full source code ownership gives us complete control.",
      author: "Michael van der Merwe",
      business: "Outdoor Gear Store",
      rating: 5,
      result: "R50k+ monthly revenue",
    },
    {
      text: "Professional, fast, and affordable. They delivered exactly what they promised - a beautiful website that actually brings in customers. The support team is always there when we need them.",
      author: "Priya Patel",
      business: "Johannesburg Law Firm",
      rating: 5,
      result: "Consistent new clients",
    },
  ]

  const benefits = [
    "Full source code ownership - no vendor lock-in",
    "Mobile-first responsive design",
    "SEO optimized for Google rankings",
    "Free SSL certificate & security",
    "24/7 South African support team",
    "Flexible payment options available",
  ]

  return (
    <section className="py-16 lg:py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 px-4 py-2 bg-blue-100 text-blue-700 border-blue-200">
            <Star className="w-4 h-4 mr-2 fill-current" />
            Trusted across South Africa · {SITE.stats.projectsDelivered} {SITE.statLabels.projectsDelivered.toLowerCase()}
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Why Businesses Choose{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Luminum Agency
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            We don't just build websites - we create digital assets that grow your business. Here's what makes us
            different from the rest.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="text-center group"
            >
              <div
                className={`inline-flex items-center justify-center w-16 h-16 ${stat.bg} rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-gray-600 font-medium text-sm sm:text-base">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          viewport={{ once: true }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Real Results from Real Clients</h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Don't just take our word for it. See how we've helped South African businesses grow their online presence
              and increase revenue.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
              >
                {/* Rating */}
                <div className="flex justify-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                {/* Result Badge */}
                <div className="text-center mb-4">
                  <Badge className="bg-green-100 text-green-700 border-green-200 font-semibold">
                    {testimonial.result}
                  </Badge>
                </div>

                {/* Testimonial */}
                <blockquote className="text-gray-700 mb-6 leading-relaxed">"{testimonial.text}"</blockquote>

                {/* Author */}
                <div className="text-center border-t border-gray-100 pt-4">
                  <div className="font-semibold text-gray-900">{testimonial.author}</div>
                  <div className="text-blue-600 text-sm">{testimonial.business}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Value Proposition */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 lg:p-12 border border-blue-100"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div>
              <div className="flex items-center mb-6">
                <Image src="/logo.png" alt="Luminum Agency" width={48} height={48} className="mr-4" />
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Luminum Agency</h3>
                  <p className="text-blue-600 font-medium">Your Digital Growth Partner</p>
                </div>
              </div>

              <h4 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                Why We're Different from Template Builders
              </h4>

              <p className="text-gray-700 mb-6 leading-relaxed">
                While others give you templates, we build custom solutions that actually grow your business. You get
                full source code ownership, unlimited customization, and a website that's truly yours.
              </p>

              <div className="space-y-3">
                {benefits.slice(0, 3).map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="flex items-center"
                  >
                    <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{benefit}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Column - Benefits */}
            <div>
              <div className="bg-white rounded-2xl p-6 shadow-lg">
                <h5 className="text-xl font-bold text-gray-900 mb-4">What You Get with Luminum</h5>
                <div className="space-y-3">
                  {benefits.slice(3).map((benefit, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex items-center"
                    >
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">{benefit}</span>
                    </motion.div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl text-white text-center">
                  <div className="font-bold text-lg mb-1">Ready to Get Started?</div>
                  <div className="text-blue-100 text-sm">
                    Professional development, proven delivery — {SITE.stats.projectsDelivered}{" "}
                    {SITE.statLabels.projectsDelivered.toLowerCase()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
