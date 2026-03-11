import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  // Currency configuration
  const currencyConfig: Record<string, { symbol: string; locale: string; code: string }> = {
    'ZAR': { symbol: 'R', locale: 'en-ZA', code: 'ZAR' },
    'USD': { symbol: '$', locale: 'en-US', code: 'USD' },
    'NGN': { symbol: '₦', locale: 'en-NG', code: 'NGN' },
    'GHS': { symbol: '₵', locale: 'en-GH', code: 'GHS' },
    'EUR': { symbol: '€', locale: 'en-EU', code: 'EUR' },
    'GBP': { symbol: '£', locale: 'en-GB', code: 'GBP' },
  }

  const config = currencyConfig[currency.toUpperCase()] || currencyConfig['USD']
  
  try {
    // Use Intl.NumberFormat for proper currency formatting
    const formatter = new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    
    return formatter.format(amount)
  } catch (error) {
    // Fallback formatting if Intl.NumberFormat fails
    return `${config.symbol}${amount.toFixed(2)}`
  }
}

export function formatNumber(number: number, decimals: number = 0): string {
  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(number)
  } catch (error) {
    return number.toFixed(decimals)
  }
}

export function formatDate(date: Date | string, options: {
  includeTime?: boolean
  relative?: boolean
  format?: 'short' | 'medium' | 'long'
} = {}): string {
  const { includeTime = false, relative = false, format = 'medium' } = options
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (relative) {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`
    return `${Math.floor(diffInSeconds / 31536000)}y ago`
  }
  
  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? 'short' : format === 'long' ? 'long' : 'short',
    day: 'numeric',
  }
  
  if (includeTime) {
    formatOptions.hour = '2-digit'
    formatOptions.minute = '2-digit'
  }
  
  return dateObj.toLocaleDateString('en-US', formatOptions)
}

export function formatDuration(seconds: number): string {
  const totalSeconds = Math.round(seconds)
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  } else {
    return `${remainingSeconds}s`
  }
}
