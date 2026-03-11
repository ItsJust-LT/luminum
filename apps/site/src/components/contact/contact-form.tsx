"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Send, CheckCircle2 } from "lucide-react"

export default function ContactForm() {
  const [isVisible, setIsVisible] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    setIsSubmitted(true)

    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false)
      ;(e.target as HTMLFormElement).reset()
    }, 3000)
  }

  return (
    <div
      ref={sectionRef}
      className={`transition-all duration-1000 ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-10"
      }`}
    >
      <div className="mb-8">
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-4">Send Us a Message</h2>
        <p className="text-lg text-slate-600">
          Fill out the form below and we'll get back to you within 24 hours. Let's start building something amazing
          together.
        </p>
      </div>

      {isSubmitted ? (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 md:p-10 text-center">
          <div className="inline-flex p-4 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Message Sent Successfully!</h3>
          <p className="text-slate-600">Thank you for reaching out. We'll get back to you as soon as possible.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-2">
                Your Name *
              </label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="John Doe"
                className="h-12 border-2 border-slate-200 rounded-xl focus:border-[#302cff] focus:ring-2 focus:ring-[#302cff]/20"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">
                Email Address *
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="john@example.com"
                className="h-12 border-2 border-slate-200 rounded-xl focus:border-[#302cff] focus:ring-2 focus:ring-[#302cff]/20"
              />
            </div>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-bold text-slate-700 mb-2">
              Phone Number
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="068 123 4567"
              className="h-12 border-2 border-slate-200 rounded-xl focus:border-[#302cff] focus:ring-2 focus:ring-[#302cff]/20"
            />
          </div>

          <div>
            <label htmlFor="service" className="block text-sm font-bold text-slate-700 mb-2">
              Service Interested In
            </label>
            <select
              id="service"
              name="service"
              className="w-full h-12 border-2 border-slate-200 rounded-xl focus:border-[#302cff] focus:ring-2 focus:ring-[#302cff]/20 px-4 bg-white text-slate-700 font-medium"
            >
              <option value="">Select a service</option>
              <option value="web-development">Web Development</option>
              <option value="ui-ux-design">UI/UX Design</option>
              <option value="digital-marketing">Digital Marketing</option>
              <option value="seo">SEO Services</option>
              <option value="ecommerce">E-Commerce Solutions</option>
              <option value="branding">Brand Identity</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-bold text-slate-700 mb-2">
              Budget Range
            </label>
            <select
              id="budget"
              name="budget"
              className="w-full h-12 border-2 border-slate-200 rounded-xl focus:border-[#302cff] focus:ring-2 focus:ring-[#302cff]/20 px-4 bg-white text-slate-700 font-medium"
            >
              <option value="">Select your budget</option>
              <option value="under-5k">Under R5,000</option>
              <option value="5k-10k">R5,000 - R10,000</option>
              <option value="10k-20k">R10,000 - R20,000</option>
              <option value="20k-plus">R20,000+</option>
            </select>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-bold text-slate-700 mb-2">
              Tell Us About Your Project *
            </label>
            <Textarea
              id="message"
              name="message"
              required
              placeholder="Share your vision, goals, and any specific requirements..."
              className="min-h-32 border-2 border-slate-200 rounded-xl focus:border-[#302cff] focus:ring-2 focus:ring-[#302cff]/20 resize-none"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#302cff] to-[#5b57ff] hover:from-[#2820dd] hover:to-[#4a46ee] text-white font-bold text-base px-8 py-6 h-auto rounded-xl shadow-lg shadow-[#302cff]/30 disabled:opacity-50 group"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Send Message
                <Send className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
