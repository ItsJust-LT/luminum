"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Code, Smartphone, Search, Shield, Zap, Users, Globe, HeadphonesIcon, CheckCircle, Star } from "lucide-react"
import Image from "next/image"
import { SITE } from "@/lib/site-copy"
import { EASE_OUT } from "@/lib/motion"

export function BenefitsGrid() {
    const benefits = [
        {
            icon: Code,
            title: "100% Custom Development",
            description:
                "No templates or themes. Every line of code is written specifically for your business needs and brand identity.",
            color: "from-blue-500 to-cyan-500",
            iconColor: "text-blue-600",
        },
        {
            icon: Smartphone,
            title: "Mobile-First Design",
            description:
                "Your website will look perfect and function flawlessly on all devices - phones, tablets, and desktops.",
            color: "from-green-500 to-emerald-500",
            iconColor: "text-green-600",
        },
        {
            icon: Search,
            title: "SEO Optimized",
            description:
                "Built with search engine optimization in mind to help your business get found online by potential customers.",
            color: "from-purple-500 to-pink-500",
            iconColor: "text-purple-600",
        },
        {
            icon: Shield,
            title: "Full Source Code Ownership",
            description:
                "You own everything. Complete control over your website with no vendor lock-in or ongoing dependencies.",
            color: "from-orange-500 to-red-500",
            iconColor: "text-orange-600",
        },
        {
            icon: Zap,
            title: "Lightning Fast Performance",
            description:
                "Optimized for speed with modern technologies ensuring your visitors have the best possible experience.",
            color: "from-yellow-500 to-orange-500",
            iconColor: "text-yellow-600",
        },
        {
            icon: Users,
            title: "User Experience Focused",
            description: "Designed with your customers in mind to maximize engagement, conversions, and business growth.",
            color: "from-indigo-500 to-purple-500",
            iconColor: "text-indigo-600",
        },
        {
            icon: Globe,
            title: "Modern Web Standards",
            description:
                "Built using the latest web technologies and best practices for security, performance, and reliability.",
            color: "from-teal-500 to-cyan-500",
            iconColor: "text-teal-600",
        },
        {
            icon: HeadphonesIcon,
            title: "Ongoing Support",
            description: "Professional support and maintenance to keep your website running smoothly and up-to-date.",
            color: "from-rose-500 to-pink-500",
            iconColor: "text-rose-600",
        },
    ]

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2,
            },
        },
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.9 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.6,
                ease: EASE_OUT,
            },
        },
    }

    return (
        <section className="py-8 sm:py-24 bg-gradient-to-br from-white to-gray-50 relative overflow-hidden">
            {/* Animated background elements */}
            <motion.div
                className="absolute top-0 left-0 w-full h-full opacity-5"
                animate={{
                    backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{
                    duration: 25,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "reverse",
                }}
                style={{
                    backgroundImage: "radial-gradient(circle, #3b82f6 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                }}
            />

            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 relative z-10">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="text-center mb-8 sm:mb-20"
                >
                    <motion.div
                        className="flex flex-col items-center justify-center mb-4 sm:mb-8 space-y-2"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                    >
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        >
                            <Image
                                src="/logo.png"
                                alt="Luminum Agency Logo"
                                width={50}
                                height={50}
                                className="sm:w-[60px] sm:h-[60px]"
                            />
                        </motion.div>
                        <div className="text-center">
                            <h2 className="text-2xl sm:text-5xl font-black text-gray-900">What Makes Luminum Different</h2>
                            <p className="text-sm sm:text-xl text-gray-600 mt-2">Professional Development That Delivers Results</p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        viewport={{ once: true }}
                        whileHover={{ scale: 1.05 }}
                        className="flex justify-center mb-4 sm:mb-6"
                    >
                        <Badge className="px-4 py-2 sm:px-8 sm:py-4 text-xs sm:text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-xl hover:shadow-blue-500/25 transition-all duration-300 max-w-[90vw] text-center">
                            <Star className="w-3 h-3 sm:w-5 sm:h-5 mr-1 sm:mr-2 fill-current flex-shrink-0" />
                            <span className="truncate">
                              Why businesses choose Luminum · {SITE.stats.projectsDelivered}{" "}
                              {SITE.statLabels.projectsDelivered.toLowerCase()}
                            </span>
                        </Badge>
                    </motion.div>

                    <motion.p
                        className="text-sm sm:text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed px-2"
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        viewport={{ once: true }}
                    >
                        We don't just build websites - we create digital experiences that grow your business. Here's what sets
                        Luminum Agency apart from template-based solutions and other developers.
                    </motion.p>
                </motion.div>

                {/* Benefits Grid */}
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                >
                    {benefits.map((benefit, index) => (
                        <motion.div
                            key={index}
                            variants={itemVariants}
                            whileHover={{
                                y: -10,
                                scale: 1.02,
                                transition: { duration: 0.3 },
                            }}
                        >
                            <Card className="h-full bg-white shadow-xl border-2 border-gray-100 hover:border-gray-200 hover:shadow-2xl transition-all duration-300 group relative overflow-hidden">
                                {/* Animated background gradient */}
                                <motion.div
                                    className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                                    initial={{ scale: 0, rotate: 45 }}
                                    whileHover={{ scale: 1.5, rotate: 0 }}
                                    transition={{ duration: 0.5 }}
                                />

                                <CardContent className="p-4 sm:p-8 text-center relative z-10">
                                    <motion.div
                                        className="inline-flex items-center justify-center w-12 h-12 sm:w-20 sm:h-20 bg-gray-50 rounded-2xl mb-3 sm:mb-6 group-hover:bg-white transition-all duration-300 shadow-lg group-hover:shadow-xl"
                                        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <benefit.icon
                                            className={`w-6 h-6 sm:w-10 sm:h-10 ${benefit.iconColor} group-hover:scale-110 transition-transform duration-300`}
                                        />
                                    </motion.div>

                                    <motion.h3
                                        className="text-sm sm:text-xl font-black text-gray-900 mb-2 sm:mb-4 group-hover:text-gray-800 transition-colors duration-300"
                                        initial={{ opacity: 0 }}
                                        whileInView={{ opacity: 1 }}
                                        transition={{ duration: 0.6, delay: 0.2 + index * 0.05 }}
                                        viewport={{ once: true }}
                                    >
                                        {benefit.title}
                                    </motion.h3>

                                    <motion.p
                                        className="text-xs sm:text-base text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300"
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.6, delay: 0.3 + index * 0.05 }}
                                        viewport={{ once: true }}
                                    >
                                        {benefit.description}
                                    </motion.p>

                                    {/* Hover indicator */}
                                    <motion.div
                                        className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        initial={{ scale: 0 }}
                                        whileHover={{ scale: 1 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-green-500" />
                                    </motion.div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Bottom CTA Section */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    viewport={{ once: true, margin: "-100px" }}
                    className="text-center mt-8 sm:mt-20"
                >
                    <motion.div
                        className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl p-4 sm:p-12 text-white shadow-2xl max-w-5xl mx-auto relative overflow-hidden"
                        whileHover={{
                            scale: 1.02,
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        }}
                        transition={{ duration: 0.3 }}
                    >
                        {/* Animated background pattern */}
                        <motion.div
                            className="absolute inset-0 opacity-5"
                            animate={{
                                backgroundPosition: ["0% 0%", "100% 100%"],
                            }}
                            transition={{
                                duration: 20,
                                repeat: Number.POSITIVE_INFINITY,
                                repeatType: "reverse",
                            }}
                            style={{
                                backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                                backgroundSize: "40px 40px",
                            }}
                        />

                        <motion.div
                            className="flex flex-col items-center justify-center mb-4 sm:mb-6 space-y-2 relative z-10"
                            initial={{ opacity: 0, scale: 0.8 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6 }}
                            viewport={{ once: true }}
                        >
                            <motion.div
                                animate={{ rotate: [0, 5, -5, 0] }}
                                transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                            >
                                <Image
                                    src="/logo.png"
                                    alt="Luminum Agency Logo"
                                    width={40}
                                    height={40}
                                    className="sm:w-[50px] sm:h-[50px]"
                                />
                            </motion.div>
                            <h3 className="text-lg sm:text-4xl font-black text-center">Ready to Get Started?</h3>
                        </motion.div>

                        <motion.p
                            className="text-sm sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-4 sm:mb-8 relative z-10 px-2"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            viewport={{ once: true }}
                        >
                            Join South African businesses who work with Luminum — {SITE.stats.projectsDelivered}{" "}
                            {SITE.statLabels.projectsDelivered.toLowerCase()} and counting. Get your free quote and see how custom
                            development can support your goals.
                        </motion.p>

                        <motion.div
                            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 text-center relative z-10"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ duration: 0.8, delay: 0.5 }}
                            viewport={{ once: true }}
                        >
                            {[
                                { icon: Zap, text: "7-Day Delivery", color: "text-yellow-400" },
                                { icon: Shield, text: "Full Ownership", color: "text-green-400" },
                                { icon: HeadphonesIcon, text: "Local Support", color: "text-blue-400" },
                            ].map((item, index) => (
                                <motion.div
                                    key={index}
                                    className="flex flex-col items-center p-2 sm:p-4 rounded-xl bg-white/10 hover:bg-white/15 transition-all duration-300"
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ scale: 1.05, y: -5 }}
                                >
                                    <motion.div
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{
                                            duration: 2,
                                            repeat: Number.POSITIVE_INFINITY,
                                            ease: "easeInOut",
                                            delay: index * 0.5,
                                        }}
                                    >
                                        <item.icon className={`w-6 h-6 sm:w-10 sm:h-10 ${item.color} mb-1 sm:mb-2`} />
                                    </motion.div>
                                    <span className="font-bold text-xs sm:text-lg">{item.text}</span>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    )
}
