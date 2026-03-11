interface LeadNotificationData {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
    business_name?: string
    website_type: string
    payment_plan: string
    project_details?: string
    created_at: string
  }
  
  interface NotificationConfig {
    topic: string
    title: string
    priority: "min" | "low" | "default" | "high" | "max"
    tags: string[]
  }
  
  export class NotificationService {
    private baseUrl: string
    private defaultTopic: string
  
    constructor() {
      this.baseUrl = process.env.NTFY_SERVER_URL || "https://ntfy.sh"
      this.defaultTopic = process.env.NTFY_TOPIC || "luminum-agency"
    }
  
    private formatCurrency(amount: number): string {
      return new Intl.NumberFormat("en-ZA", {
        style: "currency",
        currency: "ZAR",
        minimumFractionDigits: 0,
      }).format(amount)
    }
  
    private getPaymentPlanDetails(paymentPlan: string): { display: string; value: string; emoji: string } {
      switch (paymentPlan.toLowerCase()) {
        case "upfront":
          return {
            display: "Pay Upfront",
            value: "From R2,999 + R200/month",
            emoji: "MONEY",
          }
        case "monthly":
          return {
            display: "Monthly Plan",
            value: "R399/month for 12 months",
            emoji: "CALENDAR",
          }
        case "discuss":
          return {
            display: "Discuss Options",
            value: "Custom payment arrangement",
            emoji: "CHAT",
          }
        default:
          return {
            display: paymentPlan,
            value: "Custom arrangement",
            emoji: "QUESTION",
          }
      }
    }
  
    private getWebsiteTypeDetails(websiteType: string): { display: string; emoji: string; estimatedValue: string } {
      switch (websiteType.toLowerCase()) {
        case "business":
          return {
            display: "Business Website",
            emoji: "BUSINESS",
            estimatedValue: "R2,999 - R4,999",
          }
        case "ecommerce":
          return {
            display: "E-commerce Store",
            emoji: "SHOP",
            estimatedValue: "R4,999 - R8,999",
          }
        case "portfolio":
          return {
            display: "Portfolio Website",
            emoji: "ART",
            estimatedValue: "R2,499 - R3,999",
          }
        case "blog":
          return {
            display: "Blog/News Site",
            emoji: "BLOG",
            estimatedValue: "R2,999 - R4,499",
          }
        case "landing":
          return {
            display: "Landing Page",
            emoji: "ROCKET",
            estimatedValue: "R1,999 - R2,999",
          }
        default:
          return {
            display: websiteType,
            emoji: "WEB",
            estimatedValue: "R2,999 - R4,999",
          }
      }
    }
  
    private getPriorityLevel(websiteType: string, paymentPlan: string): "min" | "low" | "default" | "high" | "max" {
      // High priority for e-commerce and upfront payments
      if (websiteType.toLowerCase() === "ecommerce" || paymentPlan.toLowerCase() === "upfront") {
        return "high"
      }
  
      // Default priority for most leads
      return "default"
    }
  
    private formatLeadMessage(lead: LeadNotificationData): string {
      const websiteDetails = this.getWebsiteTypeDetails(lead.website_type)
      const paymentDetails = this.getPaymentPlanDetails(lead.payment_plan)
      const timestamp = new Date(lead.created_at).toLocaleString("en-ZA", {
        timeZone: "Africa/Johannesburg",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
  
      let message = `NEW LEAD ALERT\n\n`
  
      // Contact Information
      message += `CONTACT INFO\n`
      message += `Name: ${lead.first_name} ${lead.last_name}\n`
      message += `Email: ${lead.email}\n`
      message += `Phone: ${lead.phone}\n`
      if (lead.business_name) {
        message += `Business: ${lead.business_name}\n`
      }
      message += `\n`
  
      // Project Details
      message += `PROJECT DETAILS\n`
      message += `Type: ${websiteDetails.display}\n`
      message += `Est. Value: ${websiteDetails.estimatedValue}\n`
      message += `Payment: ${paymentDetails.display}\n`
      message += `Plan Details: ${paymentDetails.value}\n`
      message += `\n`
  
      // Additional Details
      if (lead.project_details && lead.project_details.trim()) {
        message += `PROJECT NOTES\n`
        message += `${lead.project_details.substring(0, 200)}${lead.project_details.length > 200 ? "..." : ""}\n`
        message += `\n`
      }
  
      // Action Items
      message += `NEXT STEPS\n`
      message += `- Contact within 2 hours (guarantee)\n`
      message += `- Prepare custom quote\n`
      message += `- Schedule consultation call\n`
      message += `\n`
  
      // Footer
      message += `Received: ${timestamp}\n`
      message += `Lead ID: ${lead.id.substring(0, 8)}\n`
      message += `\n`
      message += `Luminum Agency CRM`
  
      return message
    }
  
    async sendLeadNotification(lead: LeadNotificationData): Promise<boolean> {
      try {
        const websiteDetails = this.getWebsiteTypeDetails(lead.website_type)
        const paymentDetails = this.getPaymentPlanDetails(lead.payment_plan)
        const priority = this.getPriorityLevel(lead.website_type, lead.payment_plan)
  
        const config: NotificationConfig = {
          topic: this.defaultTopic,
          title: `New Lead: ${lead.first_name} ${lead.last_name} (${websiteDetails.display})`,
          priority,
          tags: [
            "lead",
            "new",
            lead.website_type.toLowerCase(),
            lead.payment_plan.toLowerCase(),
            lead.business_name ? "business" : "personal",
          ],
        }
  
        const message = this.formatLeadMessage(lead)
  
        const response = await fetch(`${this.baseUrl}/${config.topic}`, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            Title: config.title,
            Priority: config.priority,
            Tags: config.tags.join(","),
            ...(process.env.NTFY_ACCESS_TOKEN && {
              Authorization: `Bearer ${process.env.NTFY_ACCESS_TOKEN}`,
            }),
          },
          body: message,
        })
  
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`ntfy request failed: ${response.status} ${response.statusText} - ${errorText}`)
        }
  
        console.log("✅ Lead notification sent successfully:", {
          leadId: lead.id,
          email: lead.email,
          topic: config.topic,
          priority: config.priority,
        })
  
        return true
      } catch (error) {
        console.error("❌ Failed to send lead notification:", error)
        return false
      }
    }
  
    private getActionButtons(lead: LeadNotificationData): string {
      const actions = [
        {
          action: "view",
          label: "View Lead",
          url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/leads/${lead.id}`,
        },
        {
          action: "http",
          label: "Call Now",
          url: `tel:${lead.phone}`,
          method: "POST",
        },
        {
          action: "http",
          label: "Email",
          url: `mailto:${lead.email}?subject=Your Website Quote - Luminum Agency&body=Hi ${lead.first_name},%0D%0A%0D%0AThank you for your interest in our professional web development services...`,
          method: "POST",
        },
        {
          action: "http",
          label: "WhatsApp",
          url: `https://wa.me/${lead.phone.replace(/\D/g, "")}?text=Hi ${lead.first_name}, thank you for your website quote request. I'm reaching out from Luminum Agency...`,
          method: "POST",
        },
      ]
  
      return JSON.stringify(actions)
    }
  
    async sendDailySummary(leads: LeadNotificationData[]): Promise<boolean> {
      try {
        if (leads.length === 0) {
          return true // No leads to report
        }
  
        const today = new Date().toLocaleDateString("en-ZA", {
          timeZone: "Africa/Johannesburg",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
  
        // Calculate summary stats
        const totalLeads = leads.length
        const businessLeads = leads.filter((l) => l.website_type.toLowerCase() === "business").length
        const ecommerceLeads = leads.filter((l) => l.website_type.toLowerCase() === "ecommerce").length
        const upfrontPayments = leads.filter((l) => l.payment_plan.toLowerCase() === "upfront").length
        const monthlyPayments = leads.filter((l) => l.payment_plan.toLowerCase() === "monthly").length
  
        // Estimate potential revenue
        const estimatedRevenue = leads.reduce((total, lead) => {
          const baseValue = lead.website_type.toLowerCase() === "ecommerce" ? 6000 : 3500
          return total + baseValue
        }, 0)
  
        let message = `📊 DAILY LEAD SUMMARY - ${today}\n\n`
  
        message += `📈 OVERVIEW\n`
        message += `• Total Leads: ${totalLeads}\n`
        message += `• Est. Revenue: ${this.formatCurrency(estimatedRevenue)}\n`
        message += `• Avg. per Lead: ${this.formatCurrency(estimatedRevenue / totalLeads)}\n`
        message += `\n`
  
        message += `🎯 LEAD BREAKDOWN\n`
        message += `• Business Sites: ${businessLeads}\n`
        message += `• E-commerce: ${ecommerceLeads}\n`
        message += `• Other Types: ${totalLeads - businessLeads - ecommerceLeads}\n`
        message += `\n`
  
        message += `💳 PAYMENT PREFERENCES\n`
        message += `• Upfront: ${upfrontPayments} (${Math.round((upfrontPayments / totalLeads) * 100)}%)\n`
        message += `• Monthly: ${monthlyPayments} (${Math.round((monthlyPayments / totalLeads) * 100)}%)\n`
        message += `• Discuss: ${totalLeads - upfrontPayments - monthlyPayments}\n`
        message += `\n`
  
        message += `🔥 TOP LEADS TODAY\n`
        leads.slice(0, 3).forEach((lead, index) => {
          const websiteDetails = this.getWebsiteTypeDetails(lead.website_type)
          message += `${index + 1}. ${lead.first_name} ${lead.last_name}\n`
          message += `   ${websiteDetails.emoji} ${websiteDetails.display}\n`
          if (lead.business_name) {
            message += `   🏢 ${lead.business_name}\n`
          }
          message += `\n`
        })
  
        message += `💼 Luminum Agency Daily Report`
  
        const response = await fetch(`${this.baseUrl}/${this.defaultTopic}`, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            Title: `📊 Daily Summary: ${totalLeads} leads, ${this.formatCurrency(estimatedRevenue)} potential`,
            Priority: "default",
            Tags: "summary,daily,report",
            ...(process.env.NTFY_ACCESS_TOKEN && {
              Authorization: `Bearer ${process.env.NTFY_ACCESS_TOKEN}`,
            }),
          },
          body: message,
        })
  
        if (!response.ok) {
          throw new Error(`ntfy daily summary failed: ${response.status} ${response.statusText}`)
        }
  
        console.log("✅ Daily summary sent successfully:", {
          totalLeads,
          estimatedRevenue: this.formatCurrency(estimatedRevenue),
        })
  
        return true
      } catch (error) {
        console.error("❌ Failed to send daily summary:", error)
        return false
      }
    }
  
    async sendTestNotification(): Promise<boolean> {
      try {
        const testMessage =
          `🧪 TEST NOTIFICATION\n\n` +
          `This is a test notification from Luminum Agency.\n\n` +
          `✅ ntfy integration is working correctly!\n` +
          `🕐 Sent at: ${new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })}\n\n` +
          `💼 Luminum Agency Notification System`
  
        const response = await fetch(`${this.baseUrl}/${this.defaultTopic}`, {
          method: "POST",
          headers: {
            "Content-Type": "text/plain",
            Title: "🧪 Test Notification - Luminum Agency",
            Priority: "low",
            Tags: "test,system",
            ...(process.env.NTFY_ACCESS_TOKEN && {
              Authorization: `Bearer ${process.env.NTFY_ACCESS_TOKEN}`,
            }),
          },
          body: testMessage,
        })
  
        return response.ok
      } catch (error) {
        console.error("❌ Test notification failed:", error)
        return false
      }
    }
  }
  
  // Export singleton instance
  export const notificationService = new NotificationService()
  