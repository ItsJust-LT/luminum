"use server"

import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { headers } from "next/headers"

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Define the newsletter schema
const newsletterSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  preferences: z.string().optional(),
})

export type NewsletterData = z.infer<typeof newsletterSchema>

export async function subscribeToNewsletter(formData: NewsletterData) {
  try {
    // Validate email
    const validatedData = newsletterSchema.parse(formData)

    // Get client IP and user agent from headers
    const headersList = await headers()
    const forwardedFor = headersList.get("x-forwarded-for")
    const realIp = headersList.get("x-real-ip")
    const userAgent = headersList.get("user-agent")

    const clientIp = forwardedFor?.split(",")[0] || realIp || "unknown"

    // Check if email already exists
    const { data: existingSubscriber } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .eq("email", validatedData.email)
      .single()

    if (existingSubscriber) {
      // Update existing subscriber with new preferences if provided
      if (validatedData.preferences) {
        const { error: updateError } = await supabase
          .from("newsletter_subscribers")
          .update({
            preferences: validatedData.preferences,
            status: "active",
            ip_address: clientIp,
            user_agent: userAgent || "unknown",
          })
          .eq("email", validatedData.email)

        if (updateError) {
          console.error("Error updating subscriber:", updateError)
        }
      }

      return { success: true, message: "Your subscription preferences have been updated!" }
    }

    // Parse preferences if provided
    let parsedPreferences = {}
    if (validatedData.preferences) {
      try {
        parsedPreferences = JSON.parse(validatedData.preferences)
      } catch (e) {
        console.error("Error parsing preferences:", e)
      }
    }

    // Insert new subscriber with all available fields
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .insert([
        {
          email: validatedData.email,
          subscribed_at: new Date().toISOString(),
          status: "active",
          source: (parsedPreferences as any)?.source || "website",
          ip_address: clientIp,
          user_agent: userAgent || "unknown",
          preferences: validatedData.preferences || "{}",
          confirmed_at: new Date().toISOString(), // Auto-confirm for now
        },
      ])
      .select()

    if (error) {
      console.error("Error subscribing to newsletter:", error)
      return { success: false, message: "Failed to subscribe. Please try again." }
    }

    // Send notification via ntfy using proper format
    const preferences = parsedPreferences as any
    const topicsList = preferences?.topics?.length > 0 ? preferences.topics.join(", ") : "all topics"

    const notificationMessage = `New Newsletter Subscription

Email: ${validatedData.email}
Source: ${preferences?.source || "website"}
Frequency: ${preferences?.frequency || "weekly"}
Topics: ${topicsList}
Format: ${preferences?.format || "html"}
Special offers: ${preferences?.notifications ? "yes" : "no"}

IP: ${clientIp}
User Agent: ${userAgent?.substring(0, 100)}...`

    // Send to ntfy using proper format (text message with headers)
    await fetch("https://ntfy.sh/luminum-agency", {
      method: "POST",
      headers: {
        Title: "New Newsletter Subscription",
        Priority: "2",
        Tags: ["newsletter", "subscription", preferences?.source || "website"].join(","),
        Click: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/newsletter`,
        "Content-Type": "text/plain; charset=utf-8",
      },
      body: notificationMessage,
    })

    return {
      success: true,
      message: "Thank you for subscribing! You'll receive our latest insights and updates.",
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: `Please enter a valid email address.` }
    }

    console.error("Error in subscribeToNewsletter:", error)
    return { success: false, message: "An unexpected error occurred. Please try again." }
  }
}
