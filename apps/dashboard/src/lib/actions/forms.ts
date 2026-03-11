"use server"

import { serverGet, serverPatch } from "@/lib/api-server"
import type { FormSubmission, FormSubmissionFilters } from "@/lib/types/forms"

export async function getFormSubmissions(websiteId: string, filters?: FormSubmissionFilters) {
  return serverGet("/api/forms", {
    websiteId,
    seen: filters?.seen,
    contacted: filters?.contacted,
  })
}

export async function updateFormSubmissionStatus(
  submissionId: string,
  updates: { seen?: boolean; contacted?: boolean }
) {
  return serverPatch(`/api/forms/${submissionId}/status`, updates)
}

export async function getFormSubmission(submissionId: string) {
  return serverGet(`/api/forms/${submissionId}`)
}

export async function getUnseenFormsCount(organizationId: string) {
  return serverGet("/api/forms/unseen-count", { organizationId })
}
