'use client'

import { useSession } from '@/lib/auth/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import LoadingAnimation from '@/components/LoadingAnimation'

export default function AuthCheckPage() {
  const { data: session, isPending, error } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending) {
      if (session?.user) {
        router.push('/dashboard')
      } else {
        router.push('/sign-in')
      }
    }
  }, [session, isPending, router])

  if (isPending) {
    return <LoadingAnimation />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] dark:opacity-[0.05]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
        
        <div className="w-full max-w-md relative z-10">
          <div className="text-center max-w-md mx-auto p-6">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Authentication Error
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message || 'Something went wrong while checking your authentication status.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (session?.user) {
    // This will rarely render since we redirect in useEffect
    return <LoadingAnimation />
  }
  

  // User is not logged in - will redirect to sign-in
  return <LoadingAnimation />
}