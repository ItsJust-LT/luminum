"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import {
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Crown,
  Rocket,
  Phone,
  Clock,
  Shield,
  DollarSign,
  Search,
  Smartphone,
  TrendingUp,
  Award,
  Target,
} from "lucide-react"

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false)

  const packages = [
    {
      name: "Starter",
      subtitle: "Perfect for Small Businesses",
      description:
        "Get online quickly with a professional website that showcases your business and attracts customers.",
      icon: Zap,
      price: {
        monthly: 299,
        total: 2999,
        original: 4999,
        savings: "40% OFF",
      },
      popular: false,
      features: [
        "5-page responsive website",
        "Mobile-first design",
        "Basic SEO optimization",
        "Contact form integration",
        "SSL certificate included",
        "Google Analytics setup",
        "Social media integration",
        "3 months free maintenance",
        "Free domain for 1 year",
        "Email support",
      ],
      addOns: [
        { name: "Extra pages", price: "R199 each" },
        { name: "Blog setup", price: "R499" },
        { name: "E-commerce (5 products)", price: "R999" },
      ],
      idealFor: "Small businesses, freelancers, professionals, startups",
      deliveryTime: "7-10 business days",
      color: "blue",
    },
    {
      name: "Professional",
      subtitle: "Best for Growing Businesses",
      description:
        "Complete web solution with advanced features, e-commerce capabilities, and ongoing support for growing businesses.",
      icon: Crown,
      price: {
        monthly: 699,
        total: 6999,
        original: 12999,
        savings: "46% OFF",
      },
      popular: true,
      features: [
        "10-page responsive website",
        "Custom design & branding",
        "Advanced SEO optimization",
        "E-commerce store (25 products)",
        "Payment gateway integration",
        "Inventory management",
        "Customer accounts portal",
        "Email marketing integration",
        "Advanced analytics dashboard",
        "6 months free maintenance",
        "Priority phone & email support",
        "Free domain & hosting for 1 year",
      ],
      addOns: [
        { name: "Extra products (10)", price: "R299" },
        { name: "Advanced SEO package", price: "R1,999" },
        { name: "Social media management", price: "R1,499/month" },
      ],
      idealFor: "Growing businesses, online retailers, service providers",
      deliveryTime: "10-14 business days",
      color: "indigo",
    },
    {
      name: "Enterprise",
      subtitle: "For Large-Scale Operations",
      description:
        "Comprehensive web solution with custom development, advanced integrations, and dedicated support for enterprise needs.",
      icon: Rocket,
      price: {
        monthly: 1499,
        total: 14999,
        original: 24999,
        savings: "40% OFF",
      },
      popular: false,
      features: [
        "Unlimited pages & products",
        "Custom web application",
        "Advanced e-commerce features",
        "Multi-language support",
        "API integrations",
        "Custom CRM integration",
        "Advanced security features",
        "Performance optimization",
        "Dedicated account manager",
        "12 months free maintenance",
        "24/7 priority support",
        "Free hosting & domain for 2 years",
        "Monthly strategy consultations",
      ],
      addOns: [
        { name: "Mobile app development", price: "R8,999" },
        { name: "Advanced analytics", price: "R2,999" },
        { name: "Marketing automation", price: "R2,499/month" },
      ],
      idealFor: "Large businesses, enterprises, complex e-commerce operations",
      deliveryTime: "14-21 business days",
      color: "purple",
    },
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: "from-blue-600 to-blue-700",
        text: "text-blue-600",
        border: "border-blue-500",
        ring: "ring-blue-500/20",
      },
      indigo: {
        bg: "from-indigo-600 to-indigo-700",
        text: "text-indigo-600",
        border: "border-indigo-500",
        ring: "ring-indigo-500/20",
      },
      purple: {
        bg: "from-purple-600 to-purple-700",
        text: "text-purple-600",
        border: "border-purple-500",
        ring: "ring-purple-500/20",
      },
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  const addOnServices = [
    {
      icon: Search,
      name: "SEO Optimization",
      description: "Boost your Google rankings",
      price: "From R1,999/month",
      features: ["Keyword research", "On-page optimization", "Monthly reports"],
    },
    {
      icon: TrendingUp,
      name: "Digital Marketing",
      description: "Grow your online presence",
      price: "From R2,999/month",
      features: ["Social media management", "Google Ads", "Content creation"],
    },
    {
      icon: Smartphone,
      name: "Mobile App",
      description: "iOS & Android applications",
      price: "From R8,999",
      features: ["Native development", "App Store submission", "6 months support"],
    },
    {
      icon: Shield,
      name: "Website Maintenance",
      description: "Keep your site secure & updated",
      price: "From R499/month",
      features: ["Security updates", "Backups", "Performance monitoring"],
    },
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 text-lg font-bold shadow-lg mb-6">
              💰 Transparent, Affordable Pricing
            </Badge>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6">
              Choose Your Perfect
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Web Solution Package
              </span>
            </h2>

            <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto mb-8">
              Professional web services at prices that won't break the bank.
              <strong className="text-slate-900"> No hidden fees, no surprises</strong> - just honest, affordable
              pricing with flexible payment options.
            </p>

            {/* Payment Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-8">
              <span className={`font-semibold ${!isAnnual ? "text-slate-900" : "text-slate-500"}`}>
                One-time Payment
              </span>
              <Switch checked={isAnnual} onCheckedChange={setIsAnnual} className="data-[state=checked]:bg-blue-600" />
              <span className={`font-semibold ${isAnnual ? "text-slate-900" : "text-slate-500"}`}>
                Monthly Payments
              </span>
              <Badge className="bg-green-100 text-green-800 px-2 py-1 text-sm">10 months • 0% interest</Badge>
            </div>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {packages.map((pkg, index) => {
            const colorClasses = getColorClasses(pkg.color)

            return (
              <motion.div
                key={pkg.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="relative group"
              >
                <Card
                  className={`h-full transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                    pkg.popular
                      ? `border-2 ${colorClasses.border} ring-4 ${colorClasses.ring} shadow-xl`
                      : "border-2 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 text-sm font-bold shadow-lg">
                        🔥 Most Popular Choice
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClasses.bg} flex items-center justify-center shadow-lg`}
                      >
                        <pkg.icon className="w-8 h-8 text-white" />
                      </div>

                      <div className="text-right">
                        <Badge className="bg-red-100 text-red-800 mb-2">{pkg.price.savings}</Badge>
                        <div className="text-sm text-slate-500 line-through">
                          R{pkg.price.original.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <CardTitle className="text-2xl font-black text-slate-900 mb-2">{pkg.name}</CardTitle>
                    <CardDescription className="text-lg font-semibold text-slate-600 mb-4">
                      {pkg.subtitle}
                    </CardDescription>

                    {/* Pricing Display */}
                    <div className="mb-6">
                      <AnimatePresence mode="wait">
                        {isAnnual ? (
                          <motion.div
                            key="monthly"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center"
                          >
                            <div className="text-4xl font-black text-slate-900 mb-1">
                              R{pkg.price.monthly}
                              <span className="text-lg font-semibold text-slate-600">/month</span>
                            </div>
                            <div className="text-sm text-slate-500">
                              for 10 months • Total: R{pkg.price.total.toLocaleString()}
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="total"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center"
                          >
                            <div className="text-4xl font-black text-slate-900 mb-1">
                              R{pkg.price.total.toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-500">
                              One-time payment • Save R{(pkg.price.original - pkg.price.total).toLocaleString()}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <p className="text-slate-600 leading-relaxed mb-4">{pkg.description}</p>

                    {/* Key Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700">{pkg.deliveryTime}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700">Guaranteed</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Features List */}
                    <div>
                      <h4 className="font-bold text-slate-900 mb-4 flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        What's Included:
                      </h4>
                      <ul className="space-y-3">
                        {pkg.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-600">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ideal For */}
                    <div className={`p-4 rounded-xl border ${colorClasses.border} bg-slate-50`}>
                      <h4 className="font-bold text-slate-900 mb-2 flex items-center">
                        <Target className={`w-5 h-5 ${colorClasses.text} mr-2`} />
                        Perfect For:
                      </h4>
                      <p className="text-sm text-slate-600">{pkg.idealFor}</p>
                    </div>

                    {/* CTA Button */}
                    <Link href="/contact" className="block">
                      <Button
                        className={`w-full bg-gradient-to-r ${colorClasses.bg} hover:opacity-90 text-white py-4 text-lg font-bold rounded-xl shadow-lg group`}
                      >
                        Get Started Today
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>

                    {/* Additional Info */}
                    <div className="text-center pt-2 space-y-2">
                      <p className="text-xs text-slate-500">
                        💳 Flexible payment options • 🛡️ 100% satisfaction guarantee
                      </p>
                      <div className="flex items-center justify-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-500 fill-current" />
                        ))}
                        <span className="text-sm text-slate-600 ml-2">4.9/5 client rating</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Add-on Services */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-16"
        >
          <div className="text-center mb-12">
            <h3 className="text-3xl font-black text-slate-900 mb-4">Additional Services</h3>
            <p className="text-xl text-slate-600">Enhance your package with these professional add-on services</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {addOnServices.map((service, index) => (
              <motion.div
                key={service.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300"
              >
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                    <service.icon className="w-6 h-6 text-white" />
                  </div>

                  <div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">{service.name}</h4>
                    <p className="text-slate-600 text-sm mb-3">{service.description}</p>
                    <div className="text-xl font-black text-blue-600 mb-3">{service.price}</div>

                    <ul className="space-y-1">
                      {service.features.map((feature, idx) => (
                        <li key={idx} className="text-xs text-slate-500">
                          • {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 text-white"
        >
          <div className="max-w-3xl mx-auto space-y-6">
            <Award className="w-16 h-16 mx-auto mb-4" />

            <h3 className="text-3xl font-black mb-4">Ready to Get Started?</h3>

            <p className="text-xl mb-6 opacity-90">
              Join 200+ businesses that have transformed their online presence with our professional web services. Get
              your free consultation and custom quote today!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/contact">
                <Button className="bg-white text-blue-600 hover:bg-slate-100 px-8 py-4 text-lg font-bold rounded-xl shadow-lg group">
                  Get Free Quote Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <a
                href="tel:0689186043"
                className="flex items-center justify-center px-6 py-4 text-lg font-bold text-white hover:text-blue-200 transition-colors"
              >
                <Phone className="mr-2 h-5 w-5" />
                Call: 068 918 6043
              </a>
            </div>

            <div className="flex justify-center items-center space-x-6 text-sm opacity-80">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>Fast delivery</span>
              </div>
              <div className="flex items-center space-x-1">
                <Shield className="w-4 h-4" />
                <span>Satisfaction guaranteed</span>
              </div>
              <div className="flex items-center space-x-1">
                <DollarSign className="w-4 h-4" />
                <span>Flexible payments</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
