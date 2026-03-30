export interface EmailDnsRecords {
  spf: { type: "TXT"; name: string; value: string; valueNote?: string }
  dmarc: { type: "TXT"; name: string; value: string }
}

export interface EmailSetupStatus {
  success: boolean
  access?: boolean
  emailSystemUnavailable?: boolean
  error?: string
  setupComplete?: boolean
  domain?: string
  lastCheckAt?: string
  lastError?: string
  emailFromAddress?: string
  dnsRecords?: EmailDnsRecords
  setupNotes?: string[]
  liveChecks?: {
    spf: { ok: boolean; error?: string; record?: string }
    dmarc: { ok: boolean; error?: string; record?: string }
    resend: {
      hasApiKey: boolean
      hasWebhookSecret: boolean
      dnsVerified: boolean
      lastError: string | null
    }
  }
  resend?: {
    configured: boolean
    domainVerified: boolean
    verifiedAt: string | null
    lastValidatedAt: string | null
    lastError: string | null
    hasWebhookSecret: boolean
    secretsKeyConfigured: boolean
    inboundWebhookUrl: string
  }
  inboundPipeline?: { resendInboundReady: boolean }
}
