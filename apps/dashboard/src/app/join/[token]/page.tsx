"use client"

import { useParams } from "next/navigation"
import { JoinOrganizationClient } from "@/components/organization/join-organization-client"

export default function JoinWithTokenPage() {
  const params = useParams()
  const token = typeof params.token === "string" ? params.token : ""
  if (!token) return null
  return <JoinOrganizationClient token={token} />
}
