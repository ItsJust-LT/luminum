import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Client-side client (if needed for public operations)
export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Types for form submissions
export interface FormSubmission {
  id?: string
  form_type: string
  form_data: Record<string, any>
  user_ip?: string
  user_agent?: string
  referrer?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  country?: string
  region?: string
  city?: string
  page_url?: string
  session_id?: string
  browser_language?: string
  screen_resolution?: string
  device_type?: string
  status?: "new" | "contacted" | "qualified" | "converted" | "closed"
  priority?: "low" | "medium" | "high" | "urgent"
  assigned_to?: string
  notes?: string
  created_at?: string
  updated_at?: string
  contacted_at?: string
}
