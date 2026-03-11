"use client"

import React, { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { submitFormData } from "@/actions/form"
import { trackWhatsAppClick, trackQuoteRequest } from "@/lib/gtm"
import { Send, CheckCircle, Star, CreditCard, Zap, MessageCircle, Clock, Shield, Award } from "lucide-react"

export function LeadForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessName: "",
    websiteType: "",
    paymentPlan: "",
    projectDetails: "",
    consent: false,
  })

  // Track form view on component mount
  React.useEffect(() => {
    trackQuoteRequest()
  }, [])

  const openWhatsApp = () => {
    trackWhatsAppClick()
    window.open(
      "https://wa.me/27689186043?text=Hi%20I%27m%20interested%20in%20Luminum%20Agency%27s%20professional%20web%20development%20service",
      "_blank",
    )
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, consent: checked }))
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      // Prepare data for the new server action
      const submissionData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        businessName: formData.businessName,
        websiteType: formData.websiteType,
        paymentPlan: formData.paymentPlan,
        projectDetails: formData.projectDetails,
        consent: formData.consent,
        // Add form type and metadata for analytics
        formType: "lead",
        submittedAt: new Date().toISOString(),
        source: "website_lead_form",
      }

      const result = await submitFormData(submissionData)

      if (result.success) {
        setIsSubmitted(true)
        // Optional: Track successful submission
        console.log("Lead submitted successfully")
      } else {
        // Handle error - show error message to the user
        console.error("Form submission failed:", result.error)
        alert(result.error || "Something went wrong. Please try again.")
      }
    } catch (error) {
      console.error("Form submission error:", error)
      alert("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <section id="quote-form" className="py-20 bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-3xl p-8 lg:p-12 shadow-2xl border border-green-200"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>

            <h2 className="text-3xl font-bold text-gray-900 mb-4">Thank You!</h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Your quote request has been received. Our team will contact you within{" "}
              <span className="font-semibold text-green-600">2 hours</span> with your personalized quote and payment
              options.
            </p>

            <div className="bg-green-50 rounded-2xl p-6 mb-8 border border-green-200">
              <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-green-500 mr-2" />
                  <span>We'll call you within 2 hours</span>
                </div>
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 text-green-500 mr-2" />
                  <span>Receive your custom quote</span>
                </div>
                <div className="flex items-center">
                  <Zap className="w-4 h-4 text-green-500 mr-2" />
                  <span>Start your project immediately</span>
                </div>
              </div>
            </div>

            <Button
              onClick={openWhatsApp}
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Chat on WhatsApp Now
            </Button>
          </motion.div>
        </div>
      </section>
    )
  }

  return (
    <section id="quote-form" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <Badge className="mb-6 px-4 py-2 bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border-orange-200">
            <Star className="w-4 h-4 mr-2 fill-current" />
            Free Quote • No Obligation • 2-Hour Response
          </Badge>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Get Your{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              Free Quote
            </span>
          </h2>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Tell us about your project and we'll create a custom quote with flexible payment options that work for your
            business.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="lg:col-span-2"
          >
            <Card className="shadow-xl border border-gray-200 bg-white">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900">Tell Us About Your Project</CardTitle>
                <p className="text-gray-600">We'll create a custom quote just for you</p>
              </CardHeader>

              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">First Name *</label>
                      <Input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name *</label>
                      <Input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        placeholder="Smith"
                      />
                    </div>
                  </div>

                  {/* Contact Fields */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                      <Input
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number *</label>
                      <Input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                        placeholder="071 234 5678"
                      />
                    </div>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Business Name</label>
                    <Input
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleInputChange}
                      className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl"
                      placeholder="Your Business Name"
                    />
                  </div>

                  {/* Project Details */}
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Website Type *</label>
                      <Select onValueChange={(value) => handleSelectChange("websiteType", value)} required>
                        <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl">
                          <SelectValue placeholder="Select website type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="business">Business Website</SelectItem>
                          <SelectItem value="ecommerce">E-commerce Store</SelectItem>
                          <SelectItem value="portfolio">Portfolio Website</SelectItem>
                          <SelectItem value="blog">Blog/News Site</SelectItem>
                          <SelectItem value="landing">Landing Page</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Payment Plan *</label>
                      <Select onValueChange={(value) => handleSelectChange("paymentPlan", value)} required>
                        <SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-500 rounded-xl">
                          <SelectValue placeholder="Choose payment option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upfront">Pay Upfront (Save Money)</SelectItem>
                          <SelectItem value="monthly">Monthly Plan (R399/month)</SelectItem>
                          <SelectItem value="discuss">Discuss Options</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Project Details</label>
                    <Textarea
                      name="projectDetails"
                      value={formData.projectDetails}
                      onChange={handleInputChange}
                      className="border-2 border-gray-200 focus:border-blue-500 rounded-xl min-h-[120px] resize-none"
                      placeholder="Tell us about your project, features you need, design preferences, timeline, etc."
                    />
                  </div>

                  {/* Consent */}
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="consent" 
                      name="consent" 
                      checked={formData.consent}
                      onCheckedChange={handleCheckboxChange}
                      required 
                      className="mt-1" 
                    />
                    <label htmlFor="consent" className="text-sm text-gray-600 leading-relaxed">
                      I agree to be contacted by Luminum Agency regarding my website project and understand that my
                      information will be used to provide a personalized quote. *
                    </label>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        <span>Sending Your Quote Request...</span>
                      </div>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        Get My Free Quote Now
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            {/* What You Get */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                  What You Get
                </h3>
                <ul className="space-y-3">
                  {[
                    "Custom website built from scratch",
                    "Full source code ownership",
                    "Mobile-responsive design",
                    "7-day delivery guarantee",
                    "Professional hosting setup",
                    "Ongoing support included",
                  ].map((item, index) => (
                    <li key={index} className="flex items-start text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Payment Options */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-6 h-6 text-blue-500 mr-2" />
                  Flexible Payment
                </h3>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-blue-200">
                    <div className="font-semibold text-gray-900">Pay Upfront</div>
                    <div className="text-gray-600">From R1,999 + R200/month hosting</div>
                    <div className="text-sm text-green-600 font-medium">💰 Save R1,200+ annually</div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-green-200">
                    <div className="font-semibold text-gray-900">Monthly Plan</div>
                    <div className="text-gray-600">From R399/month (all inclusive)</div>
                    <div className="text-sm text-blue-600 font-medium">⭐ Most Popular</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guarantee */}
            <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center">
                  <Shield className="w-6 h-6 text-yellow-500 mr-2" />
                  Our Promise
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <Clock className="w-4 h-4 text-orange-500 mr-2" />
                    <span className="text-sm">2-hour response guarantee</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <Award className="w-4 h-4 text-orange-500 mr-2" />
                    <span className="text-sm">7-day delivery promise</span>
                  </div>
                  <div className="flex items-center text-gray-700">
                    <CheckCircle className="w-4 h-4 text-orange-500 mr-2" />
                    <span className="text-sm">100% satisfaction guarantee</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp CTA */}
            <Button
              onClick={openWhatsApp}
              variant="outline"
              className="w-full border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group bg-transparent"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Or Chat on WhatsApp
            </Button>

            {/* Trust Indicator */}
            <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                ))}
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">4.9/5</span> from 500+ happy clients
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}