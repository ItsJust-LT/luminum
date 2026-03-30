export interface EmailDnsRecords {
  inboundMode?: "ses" | "self_hosted"
  mx: { type: "MX"; name: string; value: string; priority: number }
  /** A record for self-hosted MX host when MAIL_SEND_IP is set */
  mailHostA?: { type: "A"; name: string; fqdn: string; value: string }
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
  /** Self-hosted mail-app DKIM TXT */
  dkim?: { type: "TXT"; name: string; selector: string; value?: string; valueNote: string }
  /** SES Easy DKIM CNAMEs */
  sesDkimCnames?: { type: "CNAME"; name: string; value: string }[]
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
    dkim:
      | { ok: boolean; selector: string; error?: string; record?: string }
      | { ok: boolean; sesStatus?: string; cnameChecks?: { name: string; target: string; ok: boolean; error?: string }[]; error?: string }
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
  /** @deprecated Use ses */
  sesFallback?: {
    enabled: boolean
    domainVerified: boolean
    verifiedAt?: string
    lastError?: string
  }
}
