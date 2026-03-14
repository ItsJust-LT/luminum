"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "next-themes"
import { RealtimeProvider } from "@/components/realtime/realtime-provider"

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <RealtimeProvider>
                {children}
            </RealtimeProvider>
        </ThemeProvider>
    )
}