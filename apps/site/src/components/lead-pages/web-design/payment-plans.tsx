"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, CreditCard, Zap, Star, ArrowRight, Shield, Clock, Award, Sparkles } from "lucide-react"

export function PaymentPlans() {
  const scrollToForm = () => {
    document.getElementById("quote-form")?.scrollIntoView({ behavior: "smooth" })
  }

  const plans = [
    {
      name: "Pay Upfront",
      subtitle: "Best Value",
      price: "R1,999",
      period: "once-off",
      monthlyFee: "R200/month",
      monthlyFeeNote: "hosting & support",
      savings: "Save R1,200+ over 12 months",
      features: [
        "Complete custom website",
        "Full source code ownership",
        "Mobile-responsive design",
        "SEO optimization included",
        "7-day delivery guarantee",
        "Professional hosting setup",
        "SSL certificate & security",
        "3 months free support",
      ],
      popular: false,
      buttonText: "Get Started - Pay Upfront",
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200",
      accentColor: "blue",
    },
    {
      name: "Monthly Plan",
      subtitle: "Most Popular",
      price: "R399",
      period: "per month",
      monthlyFee: "for 12 months",
      monthlyFeeNote: "all-inclusive",
      savings: "Start today, pay as you go",
      features: [
        "Complete custom website",
        "Full source code ownership",
        "Mobile-responsive design",
        "SEO optimization included",
        "7-day delivery guarantee",
        "Premium hosting included",
        "SSL certificate & security",
        "Priority support & maintenance",
        "Regular backups & updates",
        "Performance monitoring",
      ],
      popular: true,
      buttonText: "Get Started - Monthly Plan",
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
      borderColor: "border-green-200",
      accentColor: "green",
    },
  ]

  const benefits = [
    {
      icon: Shield,
      title: "Same Quality",
      description: "Both plans deliver identical professional websites with full source code ownership",
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      icon: CreditCard,
      title: "Flexible Budget",
      description: "Choose upfront savings or monthly convenience - whatever works for your business",
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      icon: Award,
      title: "No Compromise",
      description: "Professional support, 7-day delivery, and complete ownership regardless of payment choice",
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
  ]

  return (
    <section className="py-20 lg:py-32 bg-gradient-to-br from-gray-50 to-blue-50/30 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-200/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 4,
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-6 px-6 py-3 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-200 shadow-lg">
              <CreditCard className="w-4 h-4 mr-2" />
              Flexible Payment Options
            </Badge>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6"
          >
            Choose Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Payment Plan
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            viewport={{ once: true }}
            className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
          >
            Same professional website, same quality, same ownership. Pick the payment option that works best for your
            business budget.
          </motion.p>
        </motion.div>

        {/* Pricing Cards with OR Divider */}
        <div className="max-w-6xl mx-auto mb-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 relative">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: index * 0.2,
                }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Popular badge with enhanced styling */}
                {plan.popular && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0, y: -20 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                      delay: 0.5 + index * 0.2,
                    }}
                    viewport={{ once: true }}
                    className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20"
                  >
                    <Badge className="px-6 py-3 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-bold shadow-2xl border-0">
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      >
                        <Star className="w-4 h-4 mr-2 fill-current" />
                      </motion.div>
                      MOST POPULAR
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                      >
                        <Sparkles className="w-4 h-4 ml-2" />
                      </motion.div>
                    </Badge>
                  </motion.div>
                )}

                <motion.div
                  whileHover={{
                    scale: 1.02,
                    y: -8,
                    rotateY: 2,
                  }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <Card
                    className={`h-full transition-all duration-500 relative overflow-hidden ${
                      plan.popular
                        ? "border-2 border-green-300 shadow-2xl bg-gradient-to-br from-white via-green-50/50 to-emerald-50"
                        : "border-2 border-blue-200 shadow-xl bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20"
                    }`}
                  >
                    {/* Animated background gradient */}
                    <motion.div
                      className={`absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 ${
                        plan.popular
                          ? "bg-gradient-to-br from-green-100/50 to-emerald-100/50"
                          : "bg-gradient-to-br from-blue-100/50 to-indigo-100/50"
                      }`}
                    />

                    {/* Floating particles effect */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className={`absolute w-2 h-2 rounded-full ${
                            plan.popular ? "bg-green-300/30" : "bg-blue-300/30"
                          }`}
                          animate={{
                            y: [0, -100, 0],
                            x: [0, Math.random() * 50 - 25, 0],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 4 + Math.random() * 2,
                            repeat: Number.POSITIVE_INFINITY,
                            delay: i * 0.5,
                            ease: "easeInOut",
                          }}
                          style={{
                            left: `${20 + i * 12}%`,
                            bottom: "10%",
                          }}
                        />
                      ))}
                    </div>

                    <CardHeader className="text-center pb-8 pt-12 relative z-10">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                        viewport={{ once: true }}
                        className="mb-6"
                      >
                        <CardTitle className="text-3xl font-bold text-gray-900 mb-3">{plan.name}</CardTitle>
                        <Badge
                          className={`px-4 py-2 bg-gradient-to-r ${plan.bgGradient} ${plan.borderColor} border text-gray-700 font-semibold shadow-md`}
                        >
                          {plan.subtitle}
                        </Badge>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                        viewport={{ once: true }}
                        className="mb-8"
                      >
                        <div className="flex items-baseline justify-center mb-3">
                          <motion.span
                            className="text-6xl font-bold text-gray-900"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.2 }}
                          >
                            {plan.price}
                          </motion.span>
                          <span className="text-2xl text-gray-600 ml-2">/{plan.period}</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {plan.monthlyFee !== "all-inclusive" && plan.monthlyFee !== "for 12 months" && "+ "}
                          <span className="font-medium">{plan.monthlyFee}</span>
                          <br />
                          <span className="text-xs">{plan.monthlyFeeNote}</span>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                        viewport={{ once: true }}
                        className={`p-4 rounded-2xl bg-gradient-to-r ${plan.bgGradient} border-2 ${plan.borderColor} shadow-inner`}
                      >
                        <p className="font-bold text-gray-800 text-sm flex items-center justify-center">
                          <motion.span
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                            className="mr-2"
                          >
                            💰
                          </motion.span>
                          {plan.savings}
                        </p>
                      </motion.div>
                    </CardHeader>

                    <CardContent className="pt-0 pb-8 relative z-10">
                      <motion.ul
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                        viewport={{ once: true }}
                        className="space-y-4 mb-8"
                      >
                        {plan.features.map((feature, featureIndex) => (
                          <motion.li
                            key={featureIndex}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.7 + index * 0.1 + featureIndex * 0.05 }}
                            viewport={{ once: true }}
                            className="flex items-start group"
                          >
                            <motion.div whileHover={{ scale: 1.2, rotate: 360 }} transition={{ duration: 0.3 }}>
                              <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0 group-hover:text-green-600 transition-colors duration-200" />
                            </motion.div>
                            <span className="text-gray-700 font-medium group-hover:text-gray-900 transition-colors duration-200">
                              {feature}
                            </span>
                          </motion.li>
                        ))}
                      </motion.ul>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.8 + index * 0.1 }}
                        viewport={{ once: true }}
                      >
                        <Button
                          onClick={scrollToForm}
                          className={`w-full py-6 text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 group bg-gradient-to-r ${plan.gradient} hover:scale-105 border-0 relative overflow-hidden`}
                        >
                          {/* Button shine effect */}
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                            animate={{
                              x: ["-100%", "100%"],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "linear",
                            }}
                          />
                          <span className="relative z-10 flex items-center justify-center">
                            {plan.buttonText}
                            <motion.div
                              className="ml-2"
                              animate={{ x: [0, 5, 0] }}
                              transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                            >
                              <ArrowRight className="h-5 w-5" />
                            </motion.div>
                          </span>
                        </Button>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Mobile OR Divider - positioned with proper spacing */}
                {index === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 1 }}
                    viewport={{ once: true }}
                    className="flex items-center justify-center lg:hidden my-12"
                  >
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                    <motion.div
                      className="bg-white border-4 border-gray-300 rounded-full w-16 h-16 flex items-center justify-center mx-8 shadow-xl"
                      whileHover={{ scale: 1.1, rotate: 180 }}
                      transition={{ duration: 0.3 }}
                    >
                      <span className="text-gray-600 font-bold text-lg">OR</span>
                    </motion.div>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  </motion.div>
                )}
              </motion.div>
            ))}

            {/* Desktop OR Divider - enhanced */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 1 }}
              viewport={{ once: true }}
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 hidden lg:block"
            >
              <motion.div
                className="bg-white border-4 border-gray-300 rounded-full w-20 h-20 flex items-center justify-center shadow-2xl"
                whileHover={{ scale: 1.1, rotate: 180, borderColor: "#3B82F6" }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-gray-600 font-bold text-xl">OR</span>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Enhanced Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-white to-blue-50 rounded-3xl p-8 lg:p-12 shadow-2xl border border-gray-200 relative overflow-hidden"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(148_163_184)_1px,transparent_0)] bg-[length:24px_24px]" />
          </div>

          <div className="text-center mb-12 relative z-10">
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-4xl font-bold text-gray-900 mb-4"
            >
              Why Our Payment Plans Work
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Both options give you the same professional result. Choose based on your cash flow preference.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative z-10">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -10, scale: 1.05 }}
                className="text-center group cursor-pointer"
              >
                <motion.div
                  className={`inline-flex items-center justify-center w-20 h-20 ${benefit.bg} rounded-3xl mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300`}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <benefit.icon className={`w-10 h-10 ${benefit.color}`} />
                </motion.div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                  {benefit.title}
                </h4>
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Enhanced Final CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-center mt-16 relative z-10"
          >
            <div className="bg-gradient-to-br from-white to-orange-50 rounded-3xl p-8 shadow-xl border-2 border-orange-200 max-w-2xl mx-auto relative overflow-hidden">
              {/* Animated background elements */}
              <motion.div
                className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 rounded-full blur-2xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />

              <div className="flex items-center justify-center mb-6 relative z-10">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                >
                  <Clock className="w-8 h-8 text-orange-500 mr-3" />
                </motion.div>
                <span className="font-bold text-gray-900 text-xl">Limited Time Offer</span>
              </div>
              <p className="text-gray-700 mb-8 text-lg leading-relaxed relative z-10">
                Only <span className="font-bold text-red-600 text-xl">3 development slots</span> remaining this month.
                Secure your spot today and launch your professional website in just 7 days.
              </p>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={scrollToForm}
                  size="lg"
                  className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white px-10 py-6 text-xl font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 group relative overflow-hidden border-0"
                >
                  {/* Button shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  />
                  <span className="relative z-10 flex items-center">
                    <Zap className="mr-3 h-6 w-6" />
                    Claim Your Spot Now
                    <motion.div
                      className="ml-3"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                    >
                      <ArrowRight className="h-6 w-6" />
                    </motion.div>
                  </span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
