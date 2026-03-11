export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-MJ72XCGR'

export const pageview = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('config', GTM_ID, {
      page_location: url,
    })
  }
}

export const event = ({ action, category, label, value }: {
  action: string
  category: string
  label?: string
  value?: number
}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Custom events for lead form
export const trackLeadFormSubmission = (formData: FormData) => {
  const websiteType = formData.get('websiteType') as string
  const paymentPlan = formData.get('paymentPlan') as string
  
  event({
    action: 'form_submit',
    category: 'lead_generation',
    label: `website_type:${websiteType}_payment:${paymentPlan}`,
  })
}

export const trackWhatsAppClick = () => {
  event({
    action: 'whatsapp_click',
    category: 'engagement',
    label: 'whatsapp_contact',
  })
}

export const trackQuoteRequest = () => {
  event({
    action: 'quote_request',
    category: 'lead_generation',
    label: 'free_quote_form',
  })
}

// Declare gtag on window object
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event',
      targetId: string,
      config?: Record<string, any>
    ) => void
    dataLayer: any[]
  }
} 