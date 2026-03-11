"use client"

import type React from "react"
import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Loader2, CheckCircle, AlertCircle, Mail, Settings, Bell, Clock, Tag } from "lucide-react"
import { subscribeToNewsletter } from "@/actions/newsletter"

interface NewsletterPreferences {
  frequency: string
  topics: string[]
  format: string
  notifications: boolean
}

export default function NewsletterForm({
  className = "",
  source = "website",
}: { className?: string; source?: string }) {
  const [email, setEmail] = useState("")
  const [preferences, setPreferences] = useState<NewsletterPreferences>({
    frequency: "weekly",
    topics: [],
    format: "html",
    notifications: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [response, setResponse] = useState<{ success: boolean; message: string } | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleTopicChange = (topic: string, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      topics: checked ? [...prev.topics, topic] : prev.topics.filter((t) => t !== topic),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setResponse(null)

    try {
      const clientInfo = {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        referrer: document.referrer || "direct",
        subscribedAt: new Date().toISOString(),
      }

      const result = await subscribeToNewsletter({
        email,
        preferences: JSON.stringify({
          ...preferences,
          source,
          clientInfo,
        }),
      })

      setResponse(result)

      if (result.success) {
        setEmail("")
        setPreferences({
          frequency: "weekly",
          topics: [],
          format: "html",
          notifications: true,
        })
        setDialogOpen(false)
      }
    } catch (error) {
      console.error("Error subscribing to newsletter:", error)
      setResponse({
        success: false,
        message: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }

    // Reset message after 5 seconds
    setTimeout(() => {
      setResponse(null)
    }, 5000)
  }

  const availableTopics = [
    { id: "web-development", label: "Web Development", icon: "💻" },
    { id: "web-design", label: "Web Design", icon: "🎨" },
    { id: "seo-tips", label: "SEO Tips", icon: "🔍" },
    { id: "ecommerce", label: "E-commerce", icon: "🛒" },
    { id: "industry-news", label: "Industry News", icon: "📰" },
    { id: "technology-trends", label: "Technology Trends", icon: "🚀" },
    { id: "business-growth", label: "Business Growth", icon: "📈" },
    { id: "tutorials", label: "Tutorials & Guides", icon: "📚" },
    { id: "tools-resources", label: "Tools & Resources", icon: "🛠️" },
  ]

  const frequencyOptions = [
    { value: "daily", label: "Daily", description: "Get the latest updates every day" },
    { value: "weekly", label: "Weekly", description: "Perfect balance of content and frequency" },
    { value: "monthly", label: "Monthly", description: "Monthly digest of our best content" },
  ]

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col space-y-3">
          <div className="flex">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-800 border-gray-700 text-white pl-10 rounded-r-none focus-visible:ring-[#0B22E1]"
                disabled={isSubmitting}
              />
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-700 rounded-none border-l-0 px-3"
                  disabled={isSubmitting}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-[#0B22E1]" />
                    Newsletter Preferences
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Email Frequency */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-[#0B22E1]" />
                      Email Frequency
                    </label>
                    <div className="grid gap-3">
                      {frequencyOptions.map((option) => (
                        <div
                          key={option.value}
                          className={`p-3 border rounded-lg cursor-pointer transition-all ${
                            preferences.frequency === option.value
                              ? "border-[#0B22E1] bg-[#0B22E1]/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                          onClick={() => setPreferences((prev) => ({ ...prev, frequency: option.value }))}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-gray-600">{option.description}</div>
                            </div>
                            <div
                              className={`w-4 h-4 rounded-full border-2 ${
                                preferences.frequency === option.value
                                  ? "border-[#0B22E1] bg-[#0B22E1]"
                                  : "border-gray-300"
                              }`}
                            >
                              {preferences.frequency === option.value && (
                                <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Topics of Interest */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-[#0B22E1]" />
                      Topics of Interest
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {preferences.topics.length} selected
                      </Badge>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {availableTopics.map((topic) => (
                        <div key={topic.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={topic.id}
                            checked={preferences.topics.includes(topic.id)}
                            onCheckedChange={(checked) => handleTopicChange(topic.id, checked as boolean)}
                            className="data-[state=checked]:bg-[#0B22E1] data-[state=checked]:border-[#0B22E1]"
                          />
                          <label htmlFor={topic.id} className="text-sm cursor-pointer flex items-center">
                            <span className="mr-2">{topic.icon}</span>
                            {topic.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email Format */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-[#0B22E1]" />
                      Email Format
                    </label>
                    <Select
                      value={preferences.format}
                      onValueChange={(value) => setPreferences((prev) => ({ ...prev, format: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="html">HTML (Rich Text with Images)</SelectItem>
                        <SelectItem value="text">Plain Text (Simple & Fast)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notifications */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium flex items-center">
                      <Bell className="h-4 w-4 mr-2 text-[#0B22E1]" />
                      Additional Options
                    </label>
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="notifications"
                        checked={preferences.notifications}
                        onCheckedChange={(checked) =>
                          setPreferences((prev) => ({ ...prev, notifications: checked as boolean }))
                        }
                        className="data-[state=checked]:bg-[#0B22E1] data-[state=checked]:border-[#0B22E1]"
                      />
                      <label htmlFor="notifications" className="text-sm cursor-pointer">
                        Send me special announcements and exclusive offers
                      </label>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-2">Your Subscription Summary:</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• Frequency: {frequencyOptions.find((f) => f.value === preferences.frequency)?.label}</p>
                      <p>
                        • Topics:{" "}
                        {preferences.topics.length > 0 ? `${preferences.topics.length} selected` : "All topics"}
                      </p>
                      <p>• Format: {preferences.format === "html" ? "Rich HTML" : "Plain Text"}</p>
                      <p>• Special offers: {preferences.notifications ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              type="submit"
              className="bg-[#0B22E1] hover:bg-[#0B22E1]/90 text-white rounded-l-none"
              disabled={isSubmitting || !email}
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            </Button>
          </div>

          {response && (
            <motion.div
              className="flex items-center text-sm mt-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {response.success ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-400 mr-1 flex-shrink-0" />
                  <span className="text-green-400">{response.message}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-400 mr-1 flex-shrink-0" />
                  <span className="text-red-400">{response.message}</span>
                </>
              )}
            </motion.div>
          )}
        </div>

        <div className="text-xs text-gray-400 space-y-1">
          <p>Join 1,000+ subscribers getting insights on web development and business growth.</p>
          <p>
            {preferences.topics.length > 0 && (
              <span className="text-[#0B22E1]">
                Interested in:{" "}
                {preferences.topics
                  .slice(0, 3)
                  .map((id) => availableTopics.find((t) => t.id === id)?.label)
                  .join(", ")}
                {preferences.topics.length > 3 && ` +${preferences.topics.length - 3} more`}
              </span>
            )}
          </p>
        </div>
      </form>
    </div>
  )
}
