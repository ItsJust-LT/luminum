"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Terminal, RefreshCw, Mail, AlertTriangle, Shield } from "lucide-react"
import { api } from "@/lib/api"

interface EnvEntry {
  key: string
  value: string
  masked: boolean
}

export default function AdminEnvironmentPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<EnvEntry[]>([])
  const [additionalEntries, setAdditionalEntries] = useState<EnvEntry[]>([])
  const [additionalTruncated, setAdditionalTruncated] = useState(false)
  const [githubDeployNote, setGithubDeployNote] = useState("")
  const [sourceNote, setSourceNote] = useState("")
  const [derived, setDerived] = useState<{
    corsOriginsEffective: string[]
    corsOriginsResolvedFrom: string
    corsOriginsEnvSet?: boolean
  } | null>(null)
  const [mailStatus, setMailStatus] = useState<{ enabled: boolean; message?: string } | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [envRes, mailRes] = await Promise.all([
        api.admin.getSystemEnvironment() as Promise<{
          success?: boolean
          entries?: EnvEntry[]
          additionalEntries?: EnvEntry[]
          additionalTruncated?: boolean
          githubDeployNote?: string
          sourceNote?: string
          derived?: {
            corsOriginsEffective?: string[]
            corsOriginsResolvedFrom?: string
            corsOriginsEnvSet?: boolean
          }
          error?: string
        }>,
        api.admin.getEmailSystemStatus() as Promise<{ success?: boolean; enabled?: boolean; message?: string }>,
      ])
      if (envRes.success && envRes.entries) {
        setEntries(envRes.entries)
        setAdditionalEntries(Array.isArray(envRes.additionalEntries) ? envRes.additionalEntries : [])
        setAdditionalTruncated(!!envRes.additionalTruncated)
        setGithubDeployNote(envRes.githubDeployNote || "")
        setSourceNote(envRes.sourceNote || "")
        if (envRes.derived?.corsOriginsEffective) {
          setDerived({
            corsOriginsEffective: envRes.derived.corsOriginsEffective,
            corsOriginsResolvedFrom: envRes.derived.corsOriginsResolvedFrom || "",
            corsOriginsEnvSet: envRes.derived.corsOriginsEnvSet,
          })
        } else {
          setDerived(null)
        }
      } else {
        setError(envRes.error || "Failed to load environment")
      }
      if (mailRes.success) {
        setMailStatus({ enabled: !!mailRes.enabled, message: mailRes.message })
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Terminal className="h-7 w-7 text-primary" />
            Environment
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Read-only runtime configuration (values mirror server process env, typically from deploy .env / GitHub Actions).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 mr-2 animate-spin" : "h-4 w-4 mr-2"} />
          Refresh
        </Button>
      </div>

      {mailStatus && (
        <Card className={mailStatus.enabled ? "border-green-500/30" : "border-destructive/40"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Organization email system
            </CardTitle>
            <CardDescription>
              Controlled by <code className="text-xs bg-muted px-1 rounded">EMAIL_SYSTEM_ENABLED</code> on the API
              server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={mailStatus.enabled ? "default" : "destructive"}>
                {mailStatus.enabled ? "Enabled" : "Disabled"}
              </Badge>
              {!mailStatus.enabled && <AlertTriangle className="h-4 w-4 text-destructive" />}
            </div>
            {mailStatus.message && <p className="text-sm text-muted-foreground">{mailStatus.message}</p>}
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {derived && derived.corsOriginsEffective.length > 0 && (
        <Card className="border-primary/20 bg-muted/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Effective CORS origins
            </CardTitle>
            <CardDescription>
              Browser requests to this API are allowed from these origins.{" "}
              <span className="text-foreground/90">
                Source: <code className="text-xs bg-muted px-1 rounded">{derived.corsOriginsResolvedFrom}</code>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-sm font-mono break-all">
              {derived.corsOriginsEffective.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
            {derived.corsOriginsEnvSet === false && (
              <p className="text-xs text-muted-foreground mt-3">
                <code className="bg-muted px-1 rounded">CORS_ORIGINS</code> is not set in the raw env table below; the API
                still allows the origins listed above using <code className="bg-muted px-1 rounded">APP_URL</code> /{" "}
                <code className="bg-muted px-1 rounded">NEXT_PUBLIC_APP_URL</code> (see{" "}
                <code className="bg-muted px-1 rounded">config.ts</code>).
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {githubDeployNote && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">GitHub Actions vs runtime names</CardTitle>
            <CardDescription className="text-sm leading-relaxed">{githubDeployNote}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Primary variables</CardTitle>
          <CardDescription>{sourceNote || "Secrets are masked."}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[240px] font-mono text-xs">Name</TableHead>
                    <TableHead className="font-mono text-xs">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-mono text-xs align-top py-2">{row.key}</TableCell>
                      <TableCell className="font-mono text-xs align-top py-2 break-all">
                        {row.masked ? (
                          <span className="text-muted-foreground">{row.value}</span>
                        ) : (
                          row.value
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && additionalEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Other variables in this process</CardTitle>
            <CardDescription>
              Keys present in <code className="text-xs bg-muted px-1 rounded">process.env</code> but not in the primary
              list (e.g. Docker-injected or manual server .env).{" "}
              {additionalTruncated && "List truncated at 200 keys."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[240px] font-mono text-xs">Name</TableHead>
                    <TableHead className="font-mono text-xs">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {additionalEntries.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-mono text-xs align-top py-2">{row.key}</TableCell>
                      <TableCell className="font-mono text-xs align-top py-2 break-all">
                        {row.masked ? (
                          <span className="text-muted-foreground">{row.value}</span>
                        ) : (
                          row.value
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
