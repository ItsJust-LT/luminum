"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import {
  Globe,
  Palette,
  Smartphone,
  ShoppingCart,
  Search,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Star,
  Clock,
  Shield,
  Target,
  DollarSign,
} from "lucide-react"

export default function DetailedServices() {
  const [activeService, setActiveService] = useState(0)

  const services = [
    {
      id: "web-development",
      icon: Globe,
      title: "Custom Web Development",
      subtitle: "Professional Websites That Convert",
      description:
        "Transform your business with a stunning, responsive website that attracts customers and drives sales. Our expert web developers create fast, secure, and SEO-optimized websites tailored to your brand.",
      price: "From R2,999",
      originalPrice: "R4,999",
      savings: "40% OFF",
      timeline: "7-14 days",
      features: [
        "Responsive mobile-first design",
        "SEO optimization included",
        "Fast loading speeds (under 3 seconds)",
        "SSL certificate & security",
        "Contact forms & lead capture",
        "Google Analytics integration",
        "Social media integration",
        "3 months free maintenance",
      ],
      technologies: ["HTML5", "CSS3", "JavaScript", "React", "Next.js"],
      idealFor: "Small businesses, startups, professionals, and service providers",
      whatYouGet: [
        "Professional custom website design",
        "Mobile-responsive layout",
        "Basic SEO setup",
        "Contact form integration",
        "3 months free support",
      ],
      color: "blue",
      popular: true,
    },
    {
      id: "web-design",
      icon: Palette,
      title: "UI/UX Web Design",
      subtitle: "Beautiful Designs That Engage Users",
      description:
        "Create stunning visual experiences that captivate your audience. Our UI/UX designers craft beautiful, user-friendly interfaces that increase engagement and conversions.",
      price: "From R1,999",
      originalPrice: "R3,499",
      savings: "43% OFF",
      timeline: "5-10 days",
      features: [
        "Custom visual design",
        "User experience optimization",
        "Brand identity integration",
        "Interactive prototypes",
        "Design system creation",
        "Accessibility compliance",
        "Cross-browser compatibility",
        "Unlimited revisions",
      ],
      technologies: ["Figma", "Adobe XD", "Sketch", "Photoshop", "Illustrator"],
      idealFor: "Businesses wanting to rebrand or improve their visual presence",
      whatYouGet: [
        "Custom website mockups",
        "Interactive prototypes",
        "Brand-consistent design",
        "Mobile & desktop layouts",
        "Design files & assets",
      ],
      color: "purple",
    },
    {
      id: "mobile-development",
      icon: Smartphone,
      title: "Mobile App Development",
      subtitle: "Native iOS & Android Apps",
      description:
        "Expand your reach with professional mobile apps. We develop native iOS and Android applications that provide seamless user experiences and help you connect with customers on-the-go.",
      price: "From R8,999",
      originalPrice: "R15,999",
      savings: "44% OFF",
      timeline: "21-30 days",
      features: [
        "Native iOS & Android development",
        "Cross-platform compatibility",
        "App Store optimization",
        "Push notifications",
        "Offline functionality",
        "API integrations",
        "Analytics & tracking",
        "6 months support",
      ],
      technologies: ["React Native", "Flutter", "Swift", "Kotlin", "Firebase"],
      idealFor: "Businesses wanting to reach mobile customers and increase engagement",
      whatYouGet: [
        "Native mobile applications",
        "App Store submissions",
        "User authentication",
        "Push notification setup",
        "6 months maintenance",
      ],
      color: "green",
    },
    {
      id: "e-commerce",
      icon: ShoppingCart,
      title: "E-commerce Development",
      subtitle: "Online Stores That Sell",
      description:
        "Launch your online store and start selling today. We build secure, fast e-commerce websites with payment processing, inventory management, and conversion optimization.",
      price: "From R6,999",
      originalPrice: "R12,999",
      savings: "46% OFF",
      timeline: "14-21 days",
      features: [
        "Secure payment processing",
        "Inventory management system",
        "Order tracking & management",
        "Customer account portals",
        "Shopping cart optimization",
        "Multi-currency support",
        "Shipping integrations",
        "Sales analytics dashboard",
      ],
      technologies: ["WooCommerce", "Shopify", "Magento", "Stripe", "PayPal"],
      idealFor: "Retailers, product sellers, and businesses wanting to sell online",
      whatYouGet: [
        "Complete online store setup",
        "Payment gateway integration",
        "Product catalog management",
        "Order management system",
        "Customer support tools",
      ],
      color: "orange",
    },
    {
      id: "seo",
      icon: Search,
      title: "SEO Optimization",
      subtitle: "Rank Higher on Google",
      description:
        "Increase your online visibility and attract more customers. Our SEO experts optimize your website to rank higher on Google and drive organic traffic to your business.",
      price: "From R1,999/month",
      originalPrice: "R3,999/month",
      savings: "50% OFF",
      timeline: "Ongoing",
      features: [
        "Keyword research & optimization",
        "On-page SEO optimization",
        "Technical SEO improvements",
        "Local SEO for businesses",
        "Content optimization",
        "Link building strategies",
        "Monthly performance reports",
        "Google Analytics setup",
      ],
      technologies: ["Google Analytics", "Search Console", "SEMrush", "Ahrefs", "Screaming Frog"],
      idealFor: "Businesses wanting more website traffic and online visibility",
      whatYouGet: [
        "Complete SEO audit",
        "Keyword optimization",
        "Technical improvements",
        "Monthly progress reports",
        "Ongoing optimization",
      ],
      color: "red",
    },
    {
      id: "digital-marketing",
      icon: TrendingUp,
      title: "Digital Marketing",
      subtitle: "Grow Your Online Presence",
      description:
        "Reach more customers and grow your business online. Our digital marketing services include social media management, Google Ads, content marketing, and email campaigns.",
      price: "From R2,999/month",
      originalPrice: "R5,999/month",
      savings: "50% OFF",
      timeline: "Ongoing",
      features: [
        "Social media management",
        "Google Ads campaigns",
        "Facebook & Instagram ads",
        "Content creation & marketing",
        "Email marketing campaigns",
        "Brand reputation management",
        "Performance tracking",
        "Monthly strategy reviews",
      ],
      technologies: ["Google Ads", "Facebook Ads", "Mailchimp", "Hootsuite", "Canva"],
      idealFor: "Businesses wanting to increase brand awareness and customer acquisition",
      whatYouGet: [
        "Social media strategy",
        "Ad campaign management",
        "Content creation",
        "Performance analytics",
        "Monthly consultations",
      ],
      color: "indigo",
    },
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: "from-blue-600 to-blue-700",
        text: "text-blue-600",
        border: "border-blue-200",
        badge: "bg-blue-100 text-blue-800",
      },
      purple: {
        bg: "from-purple-600 to-purple-700",
        text: "text-purple-600",
        border: "border-purple-200",
        badge: "bg-purple-100 text-purple-800",
      },
      green: {
        bg: "from-green-600 to-green-700",
        text: "text-green-600",
        border: "border-green-200",
        badge: "bg-green-100 text-green-800",
      },
      orange: {
        bg: "from-orange-600 to-orange-700",
        text: "text-orange-600",
        border: "border-orange-200",
        badge: "bg-orange-100 text-orange-800",
      },
      red: {
        bg: "from-red-600 to-red-700",
        text: "text-red-600",
        border: "border-red-200",
        badge: "bg-red-100 text-red-800",
      },
      indigo: {
        bg: "from-indigo-600 to-indigo-700",
        text: "text-indigo-600",
        border: "border-indigo-200",
        badge: "bg-indigo-100 text-indigo-800",
      },
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 text-lg font-bold shadow-lg mb-6">
              🎯 Our Professional Services
            </Badge>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6">
              Complete Web Solutions
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                For Every Business Need
              </span>
            </h2>

            <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
              From stunning websites to powerful e-commerce platforms, we provide
              <strong className="text-slate-900"> affordable, professional web services</strong> that help your business
              succeed online.
            </p>
          </motion.div>
        </div>

        {/* Services Grid */}
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const colorClasses = getColorClasses(service.color)

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group"
              >
                <Card
                  className={`h-full border-2 transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                    service.popular
                      ? "border-blue-500 ring-2 ring-blue-500/20"
                      : "border-slate-200 hover:border-blue-300"
                  }`}
                >
                  {service.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 text-sm font-bold shadow-lg">
                        ⭐ Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${colorClasses.bg} flex items-center justify-center shadow-lg`}
                      >
                        <service.icon className="w-8 h-8 text-white" />
                      </div>

                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-sm text-slate-500 line-through">{service.originalPrice}</span>
                          <Badge className={colorClasses.badge}>{service.savings}</Badge>
                        </div>
                        <div className="text-2xl font-black text-slate-900">{service.price}</div>
                      </div>
                    </div>

                    <CardTitle className="text-2xl font-black text-slate-900 mb-2">{service.title}</CardTitle>
                    <CardDescription className="text-lg font-semibold text-slate-600 mb-3">
                      {service.subtitle}
                    </CardDescription>
                    <p className="text-slate-600 leading-relaxed">{service.description}</p>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    {/* Timeline & Ideal For */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700">{service.timeline}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-slate-500" />
                        <span className="text-sm font-semibold text-slate-700">Guaranteed</span>
                      </div>
                    </div>

                    {/* What You Get */}
                    <div>
                      <h4 className="font-bold text-slate-900 mb-3 flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                        What You Get:
                      </h4>
                      <ul className="space-y-2">
                        {service.whatYouGet.slice(0, 4).map((item, idx) => (
                          <li key={idx} className="flex items-start space-x-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span className="text-slate-600">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Ideal For */}
                    <div className={`p-4 rounded-xl border ${colorClasses.border} bg-slate-50`}>
                      <h4 className="font-bold text-slate-900 mb-2 flex items-center">
                        <Target className={`w-5 h-5 ${colorClasses.text} mr-2`} />
                        Ideal For:
                      </h4>
                      <p className="text-sm text-slate-600">{service.idealFor}</p>
                    </div>

                    {/* CTA Button */}
                    <Link href="/contact" className="block">
                      <Button
                        className={`w-full bg-gradient-to-r ${colorClasses.bg} hover:opacity-90 text-white py-3 text-lg font-bold rounded-xl shadow-lg group`}
                      >
                        Get Started Today
                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>

                    {/* Additional Info */}
                    <div className="text-center pt-2">
                      <p className="text-xs text-slate-500">
                        💳 Monthly payment plans available • 🛡️ 100% satisfaction guarantee
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA Section */}
        <motion.div
          className="text-center mt-16 p-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl border border-blue-200/50"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-center space-x-2 mb-4">
              <Star className="w-6 h-6 text-yellow-500 fill-current" />
              <Star className="w-6 h-6 text-yellow-500 fill-current" />
              <Star className="w-6 h-6 text-yellow-500 fill-current" />
              <Star className="w-6 h-6 text-yellow-500 fill-current" />
              <Star className="w-6 h-6 text-yellow-500 fill-current" />
            </div>

            <h3 className="text-3xl font-black text-slate-900 mb-4">Ready to Transform Your Business Online?</h3>

            <p className="text-xl text-slate-600 mb-6">
              Join 200+ satisfied clients who've grown their business with our professional web services. Get your free
              consultation and quote today!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/contact">
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-bold rounded-xl shadow-xl shadow-blue-600/30 border-0 group">
                  Get Free Quote Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              <div className="flex items-center space-x-4 text-slate-600">
                <div className="flex items-center space-x-1">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Fast delivery</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="w-5 h-5" />
                  <span className="font-semibold">Guaranteed results</span>
                </div>
                <div className="flex items-center space-x-1">
                  <DollarSign className="w-5 h-5" />
                  <span className="font-semibold">Affordable pricing</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
