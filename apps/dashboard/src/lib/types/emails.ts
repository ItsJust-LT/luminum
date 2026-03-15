export interface EmailSetupStatus {
  success: boolean
  access?: boolean
  setupComplete?: boolean
  domain?: string
  expectedMxHost?: string
  lastCheckAt?: string
  lastError?: string
  emailFromAddress?: string
  steps?: { title: string; description: string }[]
  error?: string
}
