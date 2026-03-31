"use client"

import { WhatsAppProvider } from "@/lib/contexts/whatsapp-context"

export default function WhatsAppShell({ children }: { children: React.ReactNode }) {
  return <WhatsAppProvider>{children}</WhatsAppProvider>
}
