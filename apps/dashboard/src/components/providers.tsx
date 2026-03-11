"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"

import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: ReactNode }) {
    const router = useRouter()

    return (
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
        </ThemeProvider>
    )
}