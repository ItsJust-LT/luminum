export interface EmailDnsRecords {
  mx: { type: "MX"; name: string; value: string; priority: number }
  spf: { type: "TXT"; name: string; value: string }
  dkim: { type: "TXT"; name: string; selector: string; valueNote: string }
  dmarc: { type: "TXT"; name: string; value: string }
}

export interface EmailSetupStatus {
  success: boolean
  access?: boolean
  setupComplete?: boolean
  domain?: string
  expectedMxHost?: string
  lastCheckAt?: string
  lastError?: string
  emailFromAddress?: string
  dnsRecords?: EmailDnsRecords
  steps?: { title: string; description: string }[]
  error?: string
}
