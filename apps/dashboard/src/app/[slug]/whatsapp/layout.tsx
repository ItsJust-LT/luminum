"use client"

import { WhatsAppProvider } from "@/lib/contexts/whatsapp-context"

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return <WhatsAppProvider>{children}</WhatsAppProvider>
}

