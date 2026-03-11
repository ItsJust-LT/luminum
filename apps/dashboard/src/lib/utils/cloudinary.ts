import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dkse90x6j'
const apiKey = process.env.CLOUDINARY_API_KEY || '727526956478699'
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'KT370zJkYbS1Oum0jgy56hl_DCQ'

console.log('Cloudinary config:', {
  cloud_name: cloudName,
  api_key: apiKey ? `${apiKey.substring(0, 4)}...` : 'undefined',
  api_secret: apiSecret ? `${apiSecret.substring(0, 4)}...` : 'undefined'
})

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
})

export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  format: string
  width: number
  height: number
  bytes: number
}

export interface CloudinaryUploadOptions {
  folder?: string
  resource_type?: 'image' | 'video' | 'raw' | 'auto'
  transformation?: any
  tags?: string[]
}

/**
 * Upload a file to Cloudinary
 */
export async function uploadToCloudinary(
  file: File | Buffer,
  options: CloudinaryUploadOptions = {}
): Promise<CloudinaryUploadResult> {
  try {
    const uploadOptions = {
      folder: options.folder || 'support-attachments',
      resource_type: options.resource_type || 'auto',
      transformation: options.transformation,
      tags: options.tags || ['support'],
    }

    let uploadResult

    if (file instanceof File) {
      // Convert File to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      uploadResult = await cloudinary.uploader.upload(
        `data:${file.type};base64,${buffer.toString('base64')}`,
        uploadOptions
      )
    } else {
      // File is already a Buffer
      uploadResult = await cloudinary.uploader.upload(
        `data:application/octet-stream;base64,${file.toString('base64')}`,
        uploadOptions
      )
    }

    return {
      public_id: uploadResult.public_id,
      secure_url: uploadResult.secure_url,
      format: uploadResult.format,
      width: uploadResult.width || 0,
      height: uploadResult.height || 0,
      bytes: uploadResult.bytes,
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error)
    throw new Error('Failed to upload file to Cloudinary')
  }
}

/**
 * Delete a file from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId)
    return result.result === 'ok'
  } catch (error) {
    console.error('Cloudinary delete error:', error)
    return false
  }
}

/**
 * Get optimized image URL with transformations
 */
export function getOptimizedImageUrl(
  publicId: string,
  transformations: any = {}
): string {
  return cloudinary.url(publicId, {
    ...transformations,
    secure: true,
  })
}

/**
 * Generate thumbnail URL
 */
export function getThumbnailUrl(
  publicId: string,
  width: number = 200,
  height: number = 200
): string {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    gravity: 'auto',
    quality: 'auto',
    secure: true,
  })
}

/**
 * Check if file type is supported for upload
 */
export function isSupportedFileType(file: File): boolean {
  const supportedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    
    // Text files
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    
    // Other
    'application/octet-stream',
  ]

  return supportedTypes.includes(file.type)
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Validate file size (max 10MB)
 */
export function validateFileSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
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
