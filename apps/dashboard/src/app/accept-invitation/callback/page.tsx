import { Suspense } from "react"
import InvitationCallbackPage from "./InvitationCallbackPage"

export default function CallbackPage() {
  return (
    <Suspense fallback={<p className="text-center py-20">Loading...</p>}>
      <InvitationCallbackPage />
    </Suspense>
  )
}
