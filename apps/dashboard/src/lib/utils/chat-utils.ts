export function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    return "Just now"
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`
  } else if (diffInHours < 168) { // 7 days
    return `${Math.floor(diffInHours / 24)}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

export function getFileIconType(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'Image'
  } else if (mimeType.startsWith('video/')) {
    return 'Video'
  } else if (mimeType.startsWith('audio/')) {
    return 'Music'
  } else if (mimeType.includes('pdf')) {
    return 'FileText'
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return 'FileText'
  } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
    return 'FileSpreadsheet'
  } else if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
    return 'Presentation'
  } else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) {
    return 'Archive'
  } else if (mimeType.includes('text/')) {
    return 'FileText'
  } else {
    return 'File'
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/')
}

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/')
}

export function isDocumentFile(mimeType: string): boolean {
  return mimeType.includes('pdf') || 
         mimeType.includes('word') || 
         mimeType.includes('document') ||
         mimeType.includes('excel') ||
         mimeType.includes('spreadsheet') ||
         mimeType.includes('powerpoint') ||
         mimeType.includes('presentation') ||
         mimeType.includes('text/')
}

export function isArchiveFile(mimeType: string): boolean {
  return mimeType.includes('zip') || 
         mimeType.includes('rar') || 
         mimeType.includes('7z') ||
         mimeType.includes('tar') ||
         mimeType.includes('gz')
}
