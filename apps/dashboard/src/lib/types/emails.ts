export interface EmailDnsRecords {
  mx: { type: "MX"; name: string; value: string; priority: number }
  /** A record for the MX hostname when MAIL_SEND_IP is set on the API */
  mailHostA?: { type: "A"; name: string; fqdn: string; value: string }
  spf: { type: "TXT"; name: string; value: string }
  dkim: { type: "TXT"; name: string; selector: string; value?: string; valueNote: string }
  dmarc: { type: "TXT"; name: string; value: string }
}

export interface EmailSetupStatus {
  success: boolean
  access?: boolean
  /** Platform-wide kill switch (EMAIL_SYSTEM_ENABLED=false) */
  emailSystemUnavailable?: boolean
  error?: string
  setupComplete?: boolean
  domain?: string
  expectedMxHost?: string
  lastCheckAt?: string
  lastError?: string
  emailFromAddress?: string
  dnsRecords?: EmailDnsRecords
  /** Operator guidance (MX conflicts, Cloudflare grey cloud, port 25) */
  setupNotes?: string[]
  steps?: { title: string; description: string }[]
}
