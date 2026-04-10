"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, MapPin, Clock, DollarSign, Users } from "lucide-react"
import Link from "next/link"
import { EASE_OUT } from "@/lib/motion"

export default function CareersPage() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: EASE_OUT },
    },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: EASE_OUT },
    },
  }

  const jobOpenings = [
    {
      title: "Senior React Developer",
      department: "Development",
      location: "Johannesburg, SA",
      type: "Full-time",
      salary: "R45,000 - R65,000",
      description: "Join our development team to build cutting-edge web applications using React and Next.js.",
      requirements: ["5+ years React experience", "Next.js proficiency", "TypeScript knowledge"],
    },
    {
      title: "UI/UX Designer",
      department: "Design",
      location: "Cape Town, SA",
      type: "Full-time",
      salary: "R35,000 - R50,000",
      description: "Create beautiful and intuitive user experiences for our clients' digital products.",
      requirements: ["3+ years design experience", "Figma proficiency", "Portfolio required"],
    },
    {
      title: "Digital Marketing Specialist",
      department: "Marketing",
      location: "Remote",
      type: "Contract",
      salary: "R25,000 - R35,000",
      description: "Drive digital marketing campaigns and help our clients grow their online presence.",
      requirements: ["SEO/SEM experience", "Google Ads certified", "Analytics expertise"],
    },
  ]

  const benefits = [
    "Competitive salary and performance bonuses",
    "Flexible working hours and remote work options",
    "Professional development and training opportunities",
    "Health and wellness benefits",
    "Modern office space in prime locations",
    "Team building events and company retreats",
    "Latest technology and equipment",
    "Career advancement opportunities",
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B22E1]/10 to-blue-50 z-0"></div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge className="bg-[#0B22E1]/10 text-[#0B22E1] border-[#0B22E1]/20 mb-4">Careers</Badge>
            </motion.div>
            <motion.h1
              className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Join Our Team
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Be part of a dynamic team that's shaping the future of digital experiences in South Africa.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Job Openings */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.h2
            className="text-3xl font-bold text-center mb-12"
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Current Openings
          </motion.h2>

          <motion.div
            className="space-y-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {jobOpenings.map((job, index) => (
              <motion.div key={index} variants={itemVariant}>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">{job.title}</h3>
                        <p className="text-gray-600 mb-4">{job.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {job.location}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {job.type}
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {job.salary}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {job.requirements.map((req, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {req}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 lg:mt-0 lg:ml-6">
                        <Link href="/contact">
                          <Button className="bg-[#0B22E1] hover:bg-[#0B22E1]/90">
                            Apply Now
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.h2
            className="text-3xl font-bold text-center mb-12"
            variants={fadeIn}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            Why Work With Us?
          </motion.h2>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {benefits.map((benefit, index) => (
              <motion.div key={index} variants={itemVariant} className="text-center">
                <div className="w-12 h-12 bg-[#0B22E1]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-[#0B22E1]" />
                </div>
                <p className="text-gray-700">{benefit}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#0B22E1] text-white">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-3xl font-bold mb-6">Don't See a Perfect Match?</h2>
            <p className="text-xl mb-8">
              We're always looking for talented individuals. Send us your CV and let's talk!
            </p>
            <Link href="/contact">
              <Button size="lg" className="bg-white text-[#0B22E1] hover:bg-gray-100">
                Send Your CV
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  )
}
