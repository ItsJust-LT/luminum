"use client"

import { useEffect, useState } from "react"
import LoadingAnimation from "./LoadingAnimation"

interface PageLoaderProps {
  isLoading: boolean
  children: React.ReactNode
  minLoadingTime?: number
}

export default function PageLoader({ 
  isLoading, 
  children, 
  minLoadingTime = 2000 
}: PageLoaderProps) {
  const [showLoader, setShowLoader] = useState(isLoading)
  const [startTime] = useState(Date.now())

  useEffect(() => {
    if (!isLoading) {
      const elapsed = Date.now() - startTime
      const remainingTime = Math.max(0, minLoadingTime - elapsed)
      
      const timer = setTimeout(() => {
        setShowLoader(false)
      }, remainingTime)

      return () => clearTimeout(timer)
    } else {
      setShowLoader(true)
    }
  }, [isLoading, startTime, minLoadingTime])

  if (showLoader) {
    return <LoadingAnimation />
  }

  return <>{children}</>
}
