"use client"

import { useEffect, useState, useCallback } from "react"
import { useOrganization } from "@/lib/contexts/organization-context"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Users,
  Shield,
  ShieldAlert,
  Link2,
  Copy,
  RefreshCw,
  Loader2,
  UserPlus,
  UserMinus,
  ChevronUp,
  ChevronDown,
  Settings,
  LogOut,
  Check,
  Pencil,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter, useParams } from "next/navigation"

interface GroupParticipant {
  id: string
  displayName: string | null
  profilePictureUrl: string | null
  isAdmin: boolean
  isSuperAdmin: boolean
}

interface GroupMetadata {
  name: string | null
  description: string | null
  owner: string | null
  createdAt: string | null
  participants: GroupParticipant[]
  participantCount: number
  inviteCode: string | null
  isReadOnly: boolean
  isAnnouncement: boolean
  isRestrict: boolean
}

export default function GroupInfoPage() {
  const { organization } = useOrganization()
  const router = useRouter()
  const params = useParams()
  const chatId = params?.chatId as string
  const slug = organization?.slug || ""
  const orgId = organization?.id

  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<GroupMetadata | null>(null)
  const [editingSubject, setEditingSubject] = useState(false)
  const [subjectInput, setSubjectInput] = useState("")
  const [editingDesc, setEditingDesc] = useState(false)
  const [descInput, setDescInput] = useState("")
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [memberRequests, setMemberRequests] = useState<any[]>([])
  const [addParticipantOpen, setAddParticipantOpen] = useState(false)
  const [addParticipantInput, setAddParticipantInput] = useState("")

  const loadGroup = useCallback(async () => {
    if (!orgId || !chatId) return
    setLoading(true)
    try {
      const res = await api.whatsapp.getGroupMetadata(chatId, orgId) as any
      if (res?.success && res?.group) {
        setGroup(res.group)
        setSubjectInput(res.group.name || "")
        setDescInput(res.group.description || "")
        if (res.group.inviteCode) {
          setInviteLink(`https://chat.whatsapp.com/${res.group.inviteCode}`)
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load group info")
    } finally {
      setLoading(false)
    }
  }, [orgId, chatId])

  const loadMemberRequests = useCallback(async () => {
    if (!orgId || !chatId) return
    try {
      const res = await api.whatsapp.getGroupMembershipRequests(chatId, orgId) as any
      if (res?.success) setMemberRequests(res.requests || [])
    } catch { /* ignore */ }
  }, [orgId, chatId])

  useEffect(() => {
    loadGroup()
    loadMemberRequests()
  }, [loadGroup, loadMemberRequests])

  const handleSaveSubject = async () => {
    if (!orgId) return
    try {
      await api.whatsapp.setGroupSubject(chatId, orgId, subjectInput)
      setGroup((prev) => prev ? { ...prev, name: subjectInput } : prev)
      setEditingSubject(false)
      toast.success("Group name updated")
    } catch (err: any) {
      toast.error(err.message || "Failed")
    }
  }

  const handleSaveDesc = async () => {
    if (!orgId) return
    try {
      await api.whatsapp.setGroupDescription(chatId, orgId, descInput)
      setGroup((prev) => prev ? { ...prev, description: descInput } : prev)
      setEditingDesc(false)
      toast.success("Description updated")
    } catch (err: any) {
      toast.error(err.message || "Failed")
    }
  }

  const handleCopyInvite = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      toast.success("Invite link copied")
    }
  }

  const handleRevokeInvite = async () => {
    if (!orgId) return
    try {
      const res = await api.whatsapp.revokeGroupInvite(chatId, orgId) as any
      if (res?.inviteLink) setInviteLink(res.inviteLink)
      toast.success("Invite link revoked and regenerated")
    } catch (err: any) {
      toast.error(err.message || "Failed")
    }
  }

  const handlePromote = async (participantId: string) => {
    if (!orgId) return
    try {
      await api.whatsapp.promoteGroupParticipants(chatId, orgId, [participantId])
      setGroup((prev) => prev ? {
        ...prev,
        participants: prev.participants.map((p) => p.id === participantId ? { ...p, isAdmin: true } : p)
      } : prev)
      toast.success("Promoted to admin")
    } catch (err: any) { toast.error(err.message || "Failed") }
  }

  const handleDemote = async (participantId: string) => {
    if (!orgId) return
    try {
      await api.whatsapp.demoteGroupParticipants(chatId, orgId, [participantId])
      setGroup((prev) => prev ? {
        ...prev,
        participants: prev.participants.map((p) => p.id === participantId ? { ...p, isAdmin: false } : p)
      } : prev)
      toast.success("Demoted from admin")
    } catch (err: any) { toast.error(err.message || "Failed") }
  }

  const handleRemove = async (participantId: string) => {
    if (!orgId) return
    try {
      await api.whatsapp.removeGroupParticipants(chatId, orgId, [participantId])
      setGroup((prev) => prev ? {
        ...prev,
        participants: prev.participants.filter((p) => p.id !== participantId),
        participantCount: prev.participantCount - 1,
      } : prev)
      toast.success("Participant removed")
    } catch (err: any) { toast.error(err.message || "Failed") }
  }

  const handleAddParticipant = async () => {
    if (!orgId || !addParticipantInput.trim()) return
    const jid = addParticipantInput.includes("@") ? addParticipantInput.trim() : `${addParticipantInput.trim().replace(/\D/g, "")}@c.us`
    try {
      await api.whatsapp.addGroupParticipants(chatId, orgId, [jid])
      toast.success("Participant added")
      setAddParticipantOpen(false)
      setAddParticipantInput("")
      loadGroup()
    } catch (err: any) { toast.error(err.message || "Failed") }
  }

  const handleApproveRequest = async (requesterId: string) => {
    if (!orgId) return
    try {
      await api.whatsapp.approveGroupMembershipRequest(chatId, orgId, requesterId)
      setMemberRequests((prev) => prev.filter((r) => r.id !== requesterId))
      toast.success("Request approved")
      loadGroup()
    } catch (err: any) { toast.error(err.message || "Failed") }
  }

  const handleRejectRequest = async (requesterId: string) => {
    if (!orgId) return
    try {
      await api.whatsapp.rejectGroupMembershipRequest(chatId, orgId, requesterId)
      setMemberRequests((prev) => prev.filter((r) => r.id !== requesterId))
      toast.success("Request rejected")
    } catch (err: any) { toast.error(err.message || "Failed") }
  }

  const handleLeaveGroup = async () => {
    if (!orgId) return
    try {
      await api.whatsapp.leaveGroup(chatId, orgId)
      toast.success("Left the group")
      router.push(`/${slug}/whatsapp`)
    } catch (err: any) { toast.error(err.message || "Failed") }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Group not found or not a group chat.</p>
          <Button variant="outline" onClick={() => router.push(`/${slug}/whatsapp`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back to chats
          </Button>
        </div>
      </div>
    )
  }

  const admins = group.participants.filter((p) => p.isAdmin || p.isSuperAdmin)
  const members = group.participants.filter((p) => !p.isAdmin && !p.isSuperAdmin)

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex h-14 flex-shrink-0 items-center gap-3 border-b bg-background px-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/${slug}/whatsapp`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{group.name || "Group"}</p>
          <p className="text-xs text-muted-foreground">{group.participantCount} participants</p>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {/* Group name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Group name</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingSubject(!editingSubject)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
            {editingSubject ? (
              <div className="flex gap-2">
                <Input value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} className="h-9" />
                <Button size="sm" onClick={handleSaveSubject} className="bg-green-500 hover:bg-green-600 text-white">Save</Button>
              </div>
            ) : (
              <p className="text-sm">{group.name || "—"}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Description</h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingDesc(!editingDesc)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea value={descInput} onChange={(e) => setDescInput(e.target.value)} rows={3} />
                <Button size="sm" onClick={handleSaveDesc} className="bg-green-500 hover:bg-green-600 text-white">Save</Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{group.description || "No description"}</p>
            )}
          </div>

          {/* Group metadata */}
          {group.createdAt && (
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Created</h3>
              <p className="text-sm">{new Date(group.createdAt).toLocaleDateString("en-US", { dateStyle: "long" })}</p>
            </div>
          )}

          {/* Invite link */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Invite link</h3>
            {inviteLink ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded truncate">{inviteLink}</code>
                <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleCopyInvite}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0" onClick={handleRevokeInvite}>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not available</p>
            )}
          </div>

          {/* Membership requests */}
          {memberRequests.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Pending requests ({memberRequests.length})
              </h3>
              <div className="space-y-1">
                {memberRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50">
                    <span className="flex-1 text-sm truncate">{req.id}</span>
                    <Button size="sm" variant="outline" onClick={() => handleApproveRequest(req.id)} className="h-7 text-xs">
                      <Check className="h-3 w-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleRejectRequest(req.id)} className="h-7 text-xs text-destructive">
                      Reject
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Participants ({group.participantCount})
              </h3>
              <Button variant="outline" size="sm" onClick={() => setAddParticipantOpen(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" />Add
              </Button>
            </div>

            {admins.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-1">Admins</p>
                {admins.map((p) => (
                  <ParticipantRow key={p.id} participant={p} onPromote={handlePromote} onDemote={handleDemote} onRemove={handleRemove} />
                ))}
              </div>
            )}
            {members.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-1">Members</p>
                {members.map((p) => (
                  <ParticipantRow key={p.id} participant={p} onPromote={handlePromote} onDemote={handleDemote} onRemove={handleRemove} />
                ))}
              </div>
            )}
          </div>

          {/* Leave group */}
          <div className="pt-4 border-t">
            <Button variant="destructive" className="w-full" onClick={handleLeaveGroup}>
              <LogOut className="h-4 w-4 mr-2" />Leave group
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Add participant dialog */}
      <Dialog open={addParticipantOpen} onOpenChange={setAddParticipantOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add participant</DialogTitle>
            <DialogDescription>Enter a phone number (with country code) or WhatsApp JID.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="e.g. 27821234567" value={addParticipantInput} onChange={(e) => setAddParticipantInput(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAddParticipantOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddParticipant} disabled={!addParticipantInput.trim()}
                className="bg-green-500 hover:bg-green-600 text-white">Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ParticipantRow({ participant, onPromote, onDemote, onRemove }: {
  participant: GroupParticipant
  onPromote: (id: string) => void
  onDemote: (id: string) => void
  onRemove: (id: string) => void
}) {
  const displayName = participant.displayName || participant.id.split("@")[0]
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
      <Avatar className="h-8 w-8">
        <AvatarImage src={participant.profilePictureUrl || undefined} alt={displayName} className="object-cover" />
        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
          {displayName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        {(participant.isAdmin || participant.isSuperAdmin) && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1">
            {participant.isSuperAdmin ? "Owner" : "Admin"}
          </Badge>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {participant.isAdmin ? (
            <DropdownMenuItem onClick={() => onDemote(participant.id)}>
              <ChevronDown className="h-4 w-4 mr-2" />Demote
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onPromote(participant.id)}>
              <ChevronUp className="h-4 w-4 mr-2" />Make admin
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onRemove(participant.id)} className="text-destructive">
            <UserMinus className="h-4 w-4 mr-2" />Remove
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
