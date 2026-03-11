"use client"

import { useEffect, useState } from "react"
import "./LoadingAnimation.css"

export default function LoadingAnimation() {
  const [codeSymbols] = useState(() => {
    const symbols = [
      { char: "{", size: 24 },
      { char: "}", size: 24 },
      { char: "[", size: 22 },
      { char: "]", size: 22 },
      { char: "(", size: 20 },
      { char: ")", size: 20 },
      { char: "=>", size: 18 },
      { char: "&&", size: 18 },
      { char: "||", size: 18 },
      { char: "===", size: 16 },
      { char: "!=", size: 16 },
      { char: "++", size: 16 },
      { char: "const", size: 14 },
      { char: "let", size: 14 },
      { char: "fn", size: 14 },
      { char: "=>", size: 18 },
    ]
    return Array.from({ length: 16 }, (_, i) => {
      const sym = symbols[i % symbols.length]
      const randomAngle = Math.random() * 360
      const randomRadius = 260 + Math.random() * 120 // keep same route range
      const randomDuration = 10 + Math.random() * 8
      return {
        id: i,
        symbol: sym.char,
        size: sym.size,
        angle: randomAngle,
        radius: randomRadius,
        delay: 0, // all symbols present immediately
        duration: randomDuration,
      }
    })
  })

  const [floatingParticles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 500,
      y: (Math.random() - 0.5) * 500,
      delay: i * 0.5,
      duration: 5 + Math.random() * 3,
      size: 2 + Math.random() * 3,
    })),
  )

  const [theme, setTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setTheme(mediaQuery.matches ? "dark" : "light")

    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  const colors = {
    light: {
      bg: "oklch(0.99 0.005 265)",
      primary: "oklch(0.42 0.26 265)",
      secondary: "oklch(0.58 0.20 265)",
      text: "oklch(0.20 0.02 265)",
      accent: "oklch(0.50 0.24 265)",
      shadow: "oklch(0.42 0.26 265 / 0.15)",
    },
    dark: {
      bg: "oklch(0.12 0.015 265)",
      primary: "oklch(0.58 0.24 265)",
      secondary: "oklch(0.48 0.20 265)",
      text: "oklch(0.96 0.005 265)",
      accent: "oklch(0.68 0.22 265)",
      shadow: "oklch(0.58 0.24 265 / 0.25)",
    },
  }

  const currentColors = colors[theme]

  return (
    <div
      className="loading-animation-container relative flex flex-col items-center justify-center w-full h-screen overflow-hidden transition-colors duration-700"
      style={{ backgroundColor: currentColors.bg }}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse 1000px 800px at 50% 45%, ${currentColors.primary}40, transparent 70%)`,
          animation: "loading-background-pulse 10s ease-in-out infinite",
        }}
      />

      <div
        className="absolute inset-0 opacity-25"
        style={{
          background: `radial-gradient(circle 700px at 30% 60%, ${currentColors.accent}30, transparent 55%)`,
          animation: "loading-background-pulse 12s ease-in-out infinite 2s",
        }}
      />

      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle 600px at 70% 40%, ${currentColors.secondary}25, transparent 50%)`,
          animation: "loading-background-pulse 14s ease-in-out infinite 4s",
        }}
      />

      {floatingParticles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `calc(50% + ${particle.x}px)`,
            top: `calc(50% + ${particle.y}px)`,
            backgroundColor: currentColors.accent,
            animation: `loading-float-drift ${particle.duration}s ease-in-out infinite ${particle.delay}s`,
            boxShadow: `0 0 ${particle.size * 3}px ${currentColors.accent}`,
            opacity: 0.4,
          }}
        />
      ))}

      {codeSymbols.map((symbol) => {
        return (
          <div
            key={symbol.id}
            className="absolute font-mono font-bold pointer-events-none"
            style={{
              fontSize: `${symbol.size}px`,
              color: currentColors.accent,
              left: "50%",
              top: "50%",
              animation: `loading-code-symbol-orbit-around ${symbol.duration}s linear infinite`,
              animationDelay: `${symbol.delay}s`,
              // @ts-ignore
              "--orbit-angle": `${symbol.angle}deg`,
              "--orbit-radius": `${symbol.radius}px`,
              textShadow: `0 0 10px ${currentColors.accent}80`,
              opacity: 0.7,
              transformOrigin: "center",
            }}
          >
            {symbol.symbol}
          </div>
        )
      })}

      <div
        className="absolute w-[550px] h-[550px] rounded-full border opacity-20"
        style={{
          borderColor: currentColors.primary,
          borderWidth: "2px",
          animation: "loading-ring-slow-rotate 15s linear infinite",
          boxShadow: `0 0 20px ${currentColors.primary}40, inset 0 0 20px ${currentColors.primary}20`,
        }}
      />

      <div
        className="absolute w-[420px] h-[420px] rounded-full border opacity-25"
        style={{
          borderColor: currentColors.accent,
          borderWidth: "2px",
          animation: "loading-ring-slow-rotate 18s linear infinite reverse",
          boxShadow: `0 0 25px ${currentColors.accent}50, inset 0 0 25px ${currentColors.accent}25`,
        }}
      />

      <div
        className="absolute w-[680px] h-[680px] rounded-full border opacity-15"
        style={{
          borderColor: currentColors.secondary,
          borderWidth: "1.5px",
          animation: "loading-ring-slow-rotate 22s linear infinite",
          boxShadow: `0 0 15px ${currentColors.secondary}30, inset 0 0 15px ${currentColors.secondary}15`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center gap-12">
        <div className="relative flex items-center justify-center h-56 w-full">
          <div
            className="absolute text-[120px] font-bold font-mono leading-none"
            style={{
              color: currentColors.primary,
              animation: "loading-bracket-left-flow 3s cubic-bezier(0.4, 0, 0.2, 1) infinite",
              filter: `drop-shadow(0 4px 20px ${currentColors.shadow}) drop-shadow(0 0 30px ${currentColors.primary}60)`,
            }}
          >
            {"<"}
          </div>

          <div
            className="absolute text-[120px] font-bold font-mono leading-none"
            style={{
              color: currentColors.accent,
              animation:
                "loading-slash-elegant-spin 3s cubic-bezier(0.4, 0, 0.2, 1) infinite 0.3s, loading-glow-pulse 2s ease-in-out infinite",
              filter: `drop-shadow(0 4px 25px ${currentColors.shadow}) drop-shadow(0 0 40px ${currentColors.accent}70)`,
            }}
          >
            {"/"}
          </div>

          <div
            className="absolute text-[120px] font-bold font-mono leading-none"
            style={{
              color: currentColors.primary,
              animation: "loading-bracket-right-flow 3s cubic-bezier(0.4, 0, 0.2, 1) infinite",
              filter: `drop-shadow(0 4px 20px ${currentColors.shadow}) drop-shadow(0 0 30px ${currentColors.primary}60)`,
            }}
          >
            {">"}
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="relative">
            <h1 className="text-2xl font-bold tracking-wider relative">
              {"Luminum Agency".split("").map((char, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    color: currentColors.text,
                    textShadow: `
                      0 0 20px ${currentColors.accent}80,
                      0 0 35px ${currentColors.primary}60,
                      0 0 50px ${currentColors.accent}40,
                      0 2px 25px ${currentColors.shadow}
                    `,
                    filter: `drop-shadow(0 0 20px ${currentColors.accent}70)`,
                  }}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </h1>

            <div
              className="absolute inset-0 pointer-events-none overflow-hidden"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${currentColors.accent}60 50%, transparent 100%)`,
                animation: "loading-gradient-sweep 3s ease-in-out infinite",
                mixBlendMode: "overlay",
              }}
            />
          </div>

      
        </div>
      </div>
    </div>
  )
}
