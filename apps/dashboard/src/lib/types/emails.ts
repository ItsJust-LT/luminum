export interface EmailDnsRecords {
  mx: { type: "MX"; name: string; value: string; priority: number }
  spf: { type: "TXT"; name: string; value: string; valueNote?: string }
  /** SES domain verification TXT at `_amazonses.<domain>` (from GetIdentityVerificationAttributes) */
  sesDomainVerificationTxt?: {
    type: "TXT"
    name: string
    nameLabel: string
    value: string
    verificationStatus?: string
    error?: string
  }
  /** SES Easy DKIM CNAMEs */
  sesDkimCnames: { type: "CNAME"; name: string; value: string }[]
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
  setupNotes?: string[]
  steps?: { title: string; description: string }[]
  liveChecks?: {
    mx: { ok: boolean; error?: string; expectedHost?: string; actualHosts?: { exchange: string; priority: number }[] }
    spf: { ok: boolean; error?: string; record?: string }
    dmarc: { ok: boolean; error?: string; record?: string }
    dkim: {
      ok: boolean
      sesStatus?: string
      cnameChecks?: { name: string; target: string; ok: boolean; error?: string }[]
      error?: string
    }
    sesIdentity: { ok: boolean; verificationStatus?: string; error?: string }
  }
  ses?: {
    configured: boolean
    domainVerified: boolean
    verifiedAt?: string
    lastError?: string
    identityStatus?: string
    dkimStatus?: string
    dkimTokens?: string[]
  }
  sesAccount?: {
    productionAccessEnabled?: boolean
    sendingEnabled?: boolean
    sandbox?: boolean
  }
  /** SES receipt rule → Lambda → API path configured on server */
  inboundPipeline?: { sesReceivingConfigured: boolean }
  /** @deprecated Use ses */
  sesFallback?: {
    enabled: boolean
    domainVerified: boolean
    verifiedAt?: string
    lastError?: string
  }
}
