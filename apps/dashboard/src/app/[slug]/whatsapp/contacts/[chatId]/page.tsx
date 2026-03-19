"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { api } from "@/lib/api"
import { useOrganization } from "@/lib/contexts/organization-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, User, MessageCircle, Image as ImageIcon, Phone, Briefcase } from "lucide-react"

function formatFallbackNumber(contactId: string): string {
  const local = contactId?.split("@")[0] || ""
  const digits = local.replace(/\D/g, "")
  return digits.length >= 6 ? `+${digits}` : local || "Unknown"
}

export default function WhatsAppContactPage() {
  const params = useParams()
  const pathname = usePathname()
  const slug = pathname?.split("/")[1] || ""
  const chatId = (params.chatId as string) || ""
  const { organization } = useOrganization()
  const orgId = organization?.id

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<any>(null)

  useEffect(() => {
    if (!orgId || !chatId) return
    setLoading(true)
    setError(null)
    api.whatsapp.getContactInfo(chatId, orgId)
      .then((res: any) => {
        if (!res?.success) throw new Error(res?.error || "Failed to load contact")
        setPayload(res)
      })
      .catch((e: any) => setError(e?.message || "Failed to load contact"))
      .finally(() => setLoading(false))
  }, [orgId, chatId])

  const chat = payload?.chat
  const contact = payload?.contact
  const stats = payload?.stats
  const displayName = useMemo(() => {
    const fromContact = contact?.displayName || contact?.name || contact?.pushname || contact?.shortName
    if (fromContact) return fromContact
    if (chat?.display_name) return chat.display_name
    if (chat?.name) return chat.name
    return formatFallbackNumber(chat?.contact_id || "")
  }, [contact, chat])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  if (error || !chat) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <Link href={`/${slug}/whatsapp`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Back</Button>
        </Link>
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {error || "Contact not found"}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
      <Link href={`/${slug}/whatsapp`}>
        <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" /> Back to chats</Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{displayName}</CardTitle>
          <CardDescription>{formatFallbackNumber(chat.contact_id)}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {contact?.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={contact.profilePictureUrl} alt={displayName} className="h-24 w-24 rounded-full object-cover border" />
          ) : (
            <div className="h-24 w-24 rounded-full border grid place-items-center text-muted-foreground"><User /></div>
          )}
          {contact?.about ? (
            <p className="text-sm text-muted-foreground">{contact.about}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {contact?.isBusiness ? <Badge variant="secondary"><Briefcase className="h-3 w-3 mr-1" /> Business</Badge> : null}
            {contact?.isMyContact ? <Badge variant="secondary">My contact</Badge> : null}
            {contact?.isWAContact ? <Badge variant="secondary">WhatsApp user</Badge> : null}
            {contact?.isBlocked ? <Badge variant="destructive">Blocked</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{formatFallbackNumber(chat.contact_id)}</span></div>
          <div><span className="text-muted-foreground">Name:</span> {contact?.name || "—"}</div>
          <div><span className="text-muted-foreground">Push name:</span> {contact?.pushname || "—"}</div>
          <div><span className="text-muted-foreground">Verified name:</span> {contact?.verifiedName || "—"}</div>
          <div><span className="text-muted-foreground">JID:</span> <span className="font-mono text-xs">{chat.contact_id}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chat stats</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-md border p-3"><MessageCircle className="h-4 w-4 mb-1 text-muted-foreground" />Messages: <b>{stats?.messageCount ?? 0}</b></div>
          <div className="rounded-md border p-3"><ImageIcon className="h-4 w-4 mb-1 text-muted-foreground" />Media: <b>{stats?.mediaCount ?? 0}</b></div>
          <div className="rounded-md border p-3">First message: <b>{stats?.firstMessageAt ? new Date(stats.firstMessageAt).toLocaleString() : "—"}</b></div>
        </CardContent>
      </Card>
    </div>
  )
}

