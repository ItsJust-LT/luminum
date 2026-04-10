"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, PenTool, Code, Rocket, CheckCircle, ArrowRight, Clock, Star, Zap } from "lucide-react"
import { SITE } from "@/lib/site-copy"

export function ProcessSection() {
  const steps = [
    {
      step: "01",
      icon: MessageSquare,
      title: "Discovery & Planning",
      description: "We discuss your business goals, target audience, and requirements to create the perfect strategy.",
      duration: "Day 1",
      color: "bg-blue-500",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      step: "02",
      icon: PenTool,
      title: "Design & Wireframing",
      description: "Custom designs and wireframes that reflect your brand and optimize user experience.",
      duration: "Days 2-3",
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
    },
    {
      step: "03",
      icon: Code,
      title: "Development & Coding",
      description: "We build your website from scratch using modern technologies - fast, secure, and mobile-optimized.",
      duration: "Days 4-6",
      color: "bg-green-500",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    {
      step: "04",
      icon: Rocket,
      title: "Launch & Support",
      description: "We launch your website, provide training, and offer ongoing support for continued success.",
      duration: "Day 7+",
      color: "bg-orange-500",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
    },
  ]

  const benefits = [
    { icon: Clock, text: "7-Day Guarantee", subtext: "Launch in one week" },
    { icon: Star, text: "Professional Quality", subtext: "No compromises" },
    { icon: CheckCircle, text: "Full Ownership", subtext: "Complete source code" },
  ]

  const scrollToForm = () => {
    document.getElementById("quote-form")?.scrollIntoView({ behavior: "smooth" })
  }

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${SITE.phoneTel}?text=Hi%20I%27d%20like%20to%20know%20more%20about%20Luminum%20Agency%27s%207-day%20development%20process`,
      "_blank",
    )
  }

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200">
            <Clock className="w-4 h-4 mr-2" />
            7-Day Delivery Process
          </Badge>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Our Proven{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Development Process
            </span>
          </h2>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            From concept to launch in just 7 days. Here's exactly how we bring your vision to life with our streamlined,
            professional process.
          </p>
        </motion.div>

        {/* Process Steps */}
        <div className="mb-20">
          {/* Desktop Layout */}
          <div className="hidden lg:grid lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Connection Arrow */}
                {index < steps.length - 1 && (
                  <div className="absolute top-20 -right-4 z-10">
                    <ArrowRight className="w-6 h-6 text-gray-300" />
                  </div>
                )}

                <Card className="h-full bg-white shadow-lg border border-gray-200 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                  <CardContent className="p-6 text-center relative">
                    {/* Step Number */}
                    <div
                      className={`absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 ${step.color} text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg`}
                    >
                      {step.step}
                    </div>

                    {/* Icon */}
                    <div
                      className={`inline-flex items-center justify-center w-16 h-16 ${step.bgColor} rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <step.icon className={`w-8 h-8 ${step.color.replace("bg-", "text-")}`} />
                    </div>

                    {/* Duration */}
                    <Badge
                      className={`mb-4 px-3 py-1 ${step.bgColor} ${step.borderColor} border text-gray-700 font-medium`}
                    >
                      {step.duration}
                    </Badge>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-gray-900 mb-3">{step.title}</h3>

                    {/* Description */}
                    <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Mobile/Tablet Layout */}
          <div className="lg:hidden space-y-6">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Connection Line */}
                {index < steps.length - 1 && <div className="absolute left-8 top-20 w-0.5 h-12 bg-gray-200 z-0"></div>}

                <Card className="bg-white shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      {/* Step Number & Icon */}
                      <div className="flex-shrink-0">
                        <div
                          className={`w-16 h-16 ${step.bgColor} rounded-2xl flex items-center justify-center relative`}
                        >
                          <step.icon className={`w-8 h-8 ${step.color.replace("bg-", "text-")}`} />
                          <div
                            className={`absolute -top-2 -right-2 w-6 h-6 ${step.color} text-white rounded-full flex items-center justify-center font-bold text-xs`}
                          >
                            {step.step}
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <Badge
                          className={`mb-3 px-3 py-1 ${step.bgColor} ${step.borderColor} border text-gray-700 font-medium text-xs`}
                        >
                          {step.duration}
                        </Badge>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 lg:p-12 border border-blue-100"
        >
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Ready to Start Your 7-Day Journey?</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join hundreds of businesses who chose our proven development process for their professional website.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid sm:grid-cols-3 gap-6 mb-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-3">
                  <benefit.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="font-semibold text-gray-900 mb-1">{benefit.text}</div>
                <div className="text-gray-600 text-sm">{benefit.subtext}</div>
              </motion.div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={scrollToForm}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group w-full sm:w-auto"
            >
              <Zap className="mr-2 h-5 w-5" />
              Start Your Project Today
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              onClick={openWhatsApp}
              variant="outline"
              size="lg"
              className="border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto bg-transparent"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Ask About Our Process
            </Button>
          </div>

          {/* Urgency Message */}
          <div className="mt-8 text-center">
            <div className="inline-flex items-center px-4 py-2 bg-orange-100 text-orange-700 rounded-full border border-orange-200">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-medium text-sm">Only 3 development slots remaining this month</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
