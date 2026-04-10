"use client"

import type { ReactNode } from "react"
import { ThemeProvider } from "next-themes"
import { RealtimeProvider } from "@/components/realtime/realtime-provider"
import { BoneyardInit } from "@/components/boneyard/boneyard-init"
import { AppMotionProvider } from "@/components/motion/app-motion-provider"

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AppMotionProvider>
                <BoneyardInit />
                <RealtimeProvider>
                    {children}
                </RealtimeProvider>
            </AppMotionProvider>
        </ThemeProvider>
    )
}