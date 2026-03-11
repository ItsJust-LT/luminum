export interface FormSubmission {
    id: string
    website_id: string
    submitted_at: string
    data: Record<string, any> // JSONB data like {name: "John", email: "john@example.com", message: "Hello"}
    seen: boolean
    contacted: boolean
    created_at: string
    updated_at: string
  }
  
  export interface FormSubmissionFilters {
    seen?: boolean
    contacted?: boolean
  }
  
  export interface FormSubmissionResponse {
    success: boolean
    submissions?: FormSubmission[]
    submission?: FormSubmission
    error?: string
  }
  