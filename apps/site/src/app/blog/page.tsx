"use client"

import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, Calendar, User, Clock } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export default function BlogPage() {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" },
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
      transition: { duration: 0.5, ease: "easeOut" },
    },
  }

  const blogPosts = [
    {
      title: "The Future of Web Development in South Africa",
      excerpt: "Exploring emerging trends and technologies shaping the web development landscape in SA.",
      image: "/placeholder.svg?height=400&width=600&query=south african web development trends",
      author: "David Nkosi",
      date: "May 15, 2023",
      readTime: "5 min read",
      category: "Industry Insights",
    },
    {
      title: "Building Responsive Websites: Best Practices for 2023",
      excerpt: "Learn the latest techniques for creating websites that work perfectly on all devices.",
      image: "/placeholder.svg?height=400&width=600&query=responsive web design best practices",
      author: "Sarah Johnson",
      date: "May 10, 2023",
      readTime: "8 min read",
      category: "Web Design",
    },
    {
      title: "SEO Strategies for South African Businesses",
      excerpt: "Boost your local search rankings with these proven SEO techniques.",
      image: "/placeholder.svg?height=400&width=600&query=seo strategies south africa",
      author: "Michael Zuma",
      date: "May 5, 2023",
      readTime: "6 min read",
      category: "SEO",
    },
    {
      title: "E-commerce Trends: What's Working in 2023",
      excerpt: "Discover the latest e-commerce trends that are driving sales and conversions.",
      image: "/placeholder.svg?height=400&width=600&query=ecommerce trends 2023",
      author: "Thandi Mbeki",
      date: "April 28, 2023",
      readTime: "7 min read",
      category: "E-commerce",
    },
    {
      title: "The Importance of Website Speed Optimization",
      excerpt: "Why page speed matters and how to optimize your website for better performance.",
      image: "/placeholder.svg?height=400&width=600&query=website speed optimization",
      author: "David Nkosi",
      date: "April 20, 2023",
      readTime: "4 min read",
      category: "Performance",
    },
    {
      title: "User Experience Design: Creating Intuitive Interfaces",
      excerpt: "Learn how to design user interfaces that are both beautiful and functional.",
      image: "/placeholder.svg?height=400&width=600&query=user experience design interfaces",
      author: "Sarah Johnson",
      date: "April 15, 2023",
      readTime: "9 min read",
      category: "UX Design",
    },
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="pt-32 pb-16 lg:pt-40 lg:pb-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B22E1]/10 to-blue-50 z-0"></div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge className="bg-[#0B22E1]/10 text-[#0B22E1] border-[#0B22E1]/20 mb-4">Blog</Badge>
            </motion.div>
            <motion.h1
              className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Insights & Updates
            </motion.h1>
            <motion.p
              className="text-xl text-gray-600 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Stay updated with the latest trends, tips, and insights from the world of web development and design.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {blogPosts.map((post, index) => (
              <motion.div key={index} variants={itemVariant}>
                <Card className="h-full hover:shadow-xl transition-shadow overflow-hidden group">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={post.image || "/placeholder.svg"}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-[#0B22E1] text-white">{post.category}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-6 flex flex-col h-full">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">{post.title}</h3>
                    <p className="text-gray-600 mb-4 flex-grow line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {post.author}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {post.date}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {post.readTime}
                      </div>
                    </div>
                    <Button variant="ghost" className="text-[#0B22E1] hover:bg-[#0B22E1]/5 p-0 h-auto justify-start">
                      Read More
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <motion.div variants={fadeIn} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-3xl font-bold mb-6">Never Miss an Update</h2>
            <p className="text-xl text-gray-600 mb-8">
              Subscribe to our newsletter and get the latest insights delivered to your inbox.
            </p>
            <Link href="/#newsletter">
              <Button className="bg-[#0B22E1] hover:bg-[#0B22E1]/90">
                Subscribe Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  )
}
