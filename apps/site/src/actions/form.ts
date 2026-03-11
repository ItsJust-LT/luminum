'use server'

// Server action for submitting forms to Luminum Analytics
// Place this in app/actions/submitForm.ts or similar

const WEBSITE_ID = 'ef4cc088-5c62-4cb6-8ce7-10204e266621' // Replace with your actual website ID
const ANALYTICS_HOST = 'https://analytics.luminum.agency'

interface FormSubmissionData {
  [key: string]: string | number | boolean | string[]
}

interface SubmissionResponse {
  success: boolean
  error?: string
}

export async function submitForm(formData: FormData): Promise<SubmissionResponse> {
  try {
    // Convert FormData to regular object
    const data: FormSubmissionData = {}
    
    for (const [key, value] of formData.entries()) {
      // Handle multiple values for same key (checkboxes, etc.)
      if (data[key]) {
        // If key already exists, convert to array or append to array
        if (Array.isArray(data[key])) {
          (data[key] as string[]).push(value.toString())
        } else {
          data[key] = [data[key] as string, value.toString()]
        }
      } else {
        data[key] = value.toString()
      }
    }

    // Add website ID to the payload
    const payload = {
      websiteId: WEBSITE_ID,
      ...data
    }

    // Send to Luminum Analytics
    const response = await fetch(`${ANALYTICS_HOST}/form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Form submission failed:', response.status, errorText)
      return {
        success: false,
        error: `Submission failed: ${response.status}`
      }
    }

    const result = await response.json()
    console.log('Form submitted successfully:', result)
    
    return {
      success: true
    }

  } catch (error) {
    console.error('Error submitting form:', error)
    return {
      success: false,
      error: 'Failed to submit form. Please try again.'
    }
  }
}

// Alternative version that accepts an object instead of FormData
export async function submitFormData(data: FormSubmissionData): Promise<SubmissionResponse> {
  try {
    const payload = {
      websiteId: WEBSITE_ID,
      ...data
    }

    const response = await fetch(`${ANALYTICS_HOST}/form`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Form submission failed:', response.status, errorText)
      return {
        success: false,
        error: `Submission failed: ${response.status}`
      }
    }

    const result = await response.json()
    console.log('Form submitted successfully:', result)
    
    return {
      success: true
    }

  } catch (error) {
    console.error('Error submitting form:', error)
    return {
      success: false,
      error: 'Failed to submit form. Please try again.'
    }
  }
}