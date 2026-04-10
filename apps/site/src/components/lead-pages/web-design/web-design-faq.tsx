"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Minus, HelpCircle, MessageCircle, ArrowRight } from "lucide-react"
import { useState } from "react"
import { SITE } from "@/lib/site-copy"

export function WebDesignFAQ() {
  const [openItems, setOpenItems] = useState<number[]>([0])

  const toggleItem = (index: number) => {
    setOpenItems((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
  }

  const faqs = [
    {
      question: "What makes Luminum Agency different from other web developers?",
      answer:
        "We specialize in 100% custom development with full source code ownership. Unlike template-based solutions, we build your website from scratch using modern technologies. You get complete control, unlimited customization possibilities, and flexible payment plans that make professional development accessible to every business.",
    },
    {
      question: "How long does it take to build my website?",
      answer:
        `We guarantee delivery within 7 days. Our proven process includes: Day 1 - Discovery & Planning, Days 2-3 - Design & Wireframing, Days 4-6 - Development & Coding, Day 7+ - Launch & Support. We've refined this timeline across ${SITE.stats.projectsDelivered} delivered projects.`,
    },
    {
      question: "What's included in the monthly payment plan?",
      answer:
        "Our monthly plan (from R399/month) includes everything: complete website development, full source code ownership, premium hosting, SSL certificate, priority support & maintenance, regular backups & updates, and performance monitoring. It's an all-inclusive solution with no hidden costs.",
    },
    {
      question: "Do I really own the source code?",
      answer:
        "Yes! You get 100% ownership of your website's source code. This means no vendor lock-in, complete control over your website, and the freedom to make changes or move hosting providers anytime. You're not renting - you're owning a digital asset.",
    },
    {
      question: "What if I need changes after the website is launched?",
      answer:
        "We provide ongoing support and maintenance. Minor updates and content changes are included in your hosting plan. For major modifications or new features, we offer competitive rates and quick turnaround times. Your website can grow and evolve with your business.",
    },
    {
      question: "Is my website mobile-friendly and SEO optimized?",
      answer:
        "Every website is built mobile-first and fully responsive. We also include comprehensive SEO optimization: proper meta tags, structured data, fast loading speeds, clean code structure, and search engine friendly URLs to help your business get found online.",
    },
    {
      question: "What happens if I'm not satisfied with my website?",
      answer:
        "We offer a 100% satisfaction guarantee. We work closely with you throughout the development process to ensure the final result exceeds your expectations. If you're not completely satisfied, we'll make revisions until you are, or provide a full refund.",
    },
    {
      question: "Can you help with e-commerce and online stores?",
      answer:
        "Yes! We build custom e-commerce solutions from R4,999. We create secure, fast, and user-friendly online stores with payment processing, inventory management, order tracking, and all the features you need to sell online successfully.",
    },
  ]

  const scrollToForm = () => {
    document.getElementById("quote-form")?.scrollIntoView({ behavior: "smooth" })
  }

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/${SITE.phoneTel}?text=Hi%20I%20have%20some%20questions%20about%20Luminum%20Agency%27s%20web%20development%20services`,
      "_blank",
    )
  }

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border-purple-200">
            <HelpCircle className="w-4 h-4 mr-2" />
            Frequently Asked Questions
          </Badge>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Everything You{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Need to Know
            </span>
          </h2>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Get answers to the most common questions about our professional web development services and process.
          </p>
        </motion.div>

        {/* FAQ Items */}
        <div className="space-y-4 mb-16">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden">
                <CardContent className="p-0">
                  <button
                    className="w-full p-6 lg:p-8 text-left flex items-center justify-between hover:bg-gray-50 transition-colors duration-300 group"
                    onClick={() => toggleItem(index)}
                  >
                    <h3 className="text-lg lg:text-xl font-bold text-gray-900 pr-4 group-hover:text-blue-600 transition-colors duration-300">
                      {faq.question}
                    </h3>
                    <motion.div
                      animate={{ rotate: openItems.includes(index) ? 45 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex-shrink-0"
                    >
                      {openItems.includes(index) ? (
                        <Minus className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
                      ) : (
                        <Plus className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors duration-300" />
                      )}
                    </motion.div>
                  </button>

                  <motion.div
                    initial={false}
                    animate={{
                      height: openItems.includes(index) ? "auto" : 0,
                      opacity: openItems.includes(index) ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 lg:px-8 pb-6 lg:pb-8">
                      <div className="border-t border-gray-200 pt-6">
                        <p className="text-gray-600 leading-relaxed text-base lg:text-lg">{faq.answer}</p>
                      </div>
                    </div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
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
            <h3 className="text-3xl font-bold text-gray-900 mb-4">Still Have Questions?</h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Can't find the answer you're looking for? Our team is ready to provide personalized answers and help you
              understand exactly how we can bring your website vision to life.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={scrollToForm}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group w-full sm:w-auto"
            >
              Get Your Free Quote
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>

            <Button
              onClick={openWhatsApp}
              variant="outline"
              size="lg"
              className="border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 w-full sm:w-auto bg-transparent"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Ask Us Directly
            </Button>
          </div>

          {/* Additional Help */}
          <div className="mt-8 text-center">
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="text-2xl mb-2">💬</div>
                <div className="font-semibold text-gray-900 mb-1">Quick Response</div>
                <div className="text-gray-600 text-sm">Get answers within 2 hours</div>
              </div>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="text-2xl mb-2">🎯</div>
                <div className="font-semibold text-gray-900 mb-1">Personalized Help</div>
                <div className="text-gray-600 text-sm">Tailored advice for your project</div>
              </div>
              <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="text-2xl mb-2">🚀</div>
                <div className="font-semibold text-gray-900 mb-1">Free Consultation</div>
                <div className="text-gray-600 text-sm">No obligation, just helpful advice</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
