"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Database,
  Table as TableIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Play,
  AlertCircle,
  Pencil,
  Code2,
  Loader2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  HardDrive,
  Users,
  Search,
  MoreHorizontal,
  Trash2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

type TableMeta = {
  name: string
  rowCount: number
  totalBytes?: number | null
  tableBytes?: number | null
  indexBytes?: number | null
}
type ColumnMeta = { name: string; type: string; nullable: boolean; default: string | null }
type SchemaResult = {
  success: boolean
  tableName: string
  columns: ColumnMeta[]
  primaryKey: string[]
}

type DbStats = {
  bytes?: number | null
  currentConnections?: number | null
  maxConnections?: number | null
}

function formatBytes(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + " GB"
  if (n >= 1e6) return (n / 1e6).toFixed(2) + " MB"
  if (n >= 1e3) return (n / 1e3).toFixed(2) + " KB"
  return String(n)
}

function rowKey(schema: SchemaResult | null, row: Record<string, unknown>, fallbackIdx: number): string {
  if (schema?.primaryKey.length) {
    return schema.primaryKey.map((k) => `${k}:${row[k] ?? "∅"}`).join("|")
  }
  return `idx:${fallbackIdx}`
}

export default function AdminDatabasePage() {
  const [tables, setTables] = useState<TableMeta[]>([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [tablesError, setTablesError] = useState<string | null>(null)
  const [tableSearch, setTableSearch] = useState("")
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [schema, setSchema] = useState<SchemaResult | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [columnsVisible, setColumnsVisible] = useState<Record<string, boolean>>({})
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [rowsLoading, setRowsLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null)
  const [editForm, setEditForm] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [dbStats, setDbStats] = useState<DbStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM "user" LIMIT 10')
  const [sqlResult, setSqlResult] = useState<{
    type: "select" | "write"
    rows?: Record<string, unknown>[]
    rowCount?: number
    affectedRows?: number
    executionTimeMs?: number
  } | null>(null)
  const [sqlError, setSqlError] = useState<string | null>(null)
  const [sqlRunning, setSqlRunning] = useState(false)

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = (await api.admin.getDatabaseStats()) as {
        success?: boolean
        database?: DbStats
        error?: string
      }
      if (res?.success && res.database) setDbStats(res.database)
    } catch {
      setDbStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const fetchTables = useCallback(async () => {
    setTablesLoading(true)
    setTablesError(null)
    try {
      const res = (await api.admin.getDatabaseTables()) as {
        success?: boolean
        tables?: TableMeta[]
        error?: string
      }
      if (res?.success && Array.isArray(res.tables)) {
        setTables(res.tables)
      } else {
        setTablesError(res?.error || "Failed to load tables")
      }
    } catch (e: unknown) {
      setTablesError(e instanceof Error ? e.message : "Failed to load tables")
    } finally {
      setTablesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTables()
    fetchStats()
  }, [fetchTables, fetchStats])

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return tables
    const q = tableSearch.trim().toLowerCase()
    return tables.filter((t) => t.name.toLowerCase().includes(q))
  }, [tables, tableSearch])

  const selectedMeta = useMemo(
    () => (selectedTable ? tables.find((t) => t.name === selectedTable) : null),
    [tables, selectedTable]
  )

  const fetchSchema = useCallback(async (tableName: string) => {
    setSchemaLoading(true)
    try {
      const res = (await api.admin.getDatabaseTableSchema(tableName)) as SchemaResult & { error?: string }
      if (res?.success && res.columns) {
        setSchema({
          success: true,
          tableName: res.tableName,
          columns: res.columns,
          primaryKey: res.primaryKey || [],
        })
        const vis: Record<string, boolean> = {}
        res.columns.forEach((c) => {
          vis[c.name] = true
        })
        setColumnsVisible(vis)
      } else {
        setSchema(null)
      }
    } catch {
      setSchema(null)
    } finally {
      setSchemaLoading(false)
    }
  }, [])

  const fetchRows = useCallback(
    async (tableName: string, page: number, limit: number) => {
      setRowsLoading(true)
      try {
        const res = (await api.admin.getDatabaseTableRows(tableName, {
          page,
          limit,
        })) as {
          success?: boolean
          rows?: Record<string, unknown>[]
          pagination?: { page: number; limit: number; total: number; totalPages: number }
        }
        if (res?.success && Array.isArray(res.rows)) {
          setRows(res.rows)
          setPagination((prev) => ({
            ...prev,
            ...res.pagination,
            page: res.pagination?.page ?? page,
            limit: res.pagination?.limit ?? limit,
          }))
        } else {
          setRows([])
        }
      } catch {
        setRows([])
      } finally {
        setRowsLoading(false)
      }
    },
    []
  )

  useLayoutEffect(() => {
    if (!selectedTable) return
    setPagination((p) => ({ ...p, page: 1 }))
  }, [selectedTable])

  useEffect(() => {
    if (!selectedTable) {
      setSchema(null)
      setRows([])
      setSchemaOpen(false)
      return
    }
    fetchSchema(selectedTable)
  }, [selectedTable, fetchSchema])

  useEffect(() => {
    if (!selectedTable) return
    fetchRows(selectedTable, pagination.page, pagination.limit)
  }, [selectedTable, pagination.page, pagination.limit, fetchRows])

  const visibleColumns = useMemo(() => {
    if (!schema) return []
    return schema.columns.filter((c) => columnsVisible[c.name] !== false)
  }, [schema, columnsVisible])

  const hasPrimaryKey = Boolean(schema && schema.primaryKey.length > 0)

  const goToPage = (page: number) => {
    if (!selectedTable || page < 1 || page > pagination.totalPages) return
    setPagination((prev) => ({ ...prev, page }))
  }

  const setPageSize = (limit: number) => {
    setPagination((prev) => ({ ...prev, limit, page: 1 }))
  }

  const openEdit = (row: Record<string, unknown>) => {
    setEditRow(row)
    setEditForm({ ...row })
    setSaveError(null)
  }

  const closeEdit = () => {
    setEditRow(null)
    setEditForm({})
    setSaveError(null)
  }

  const handleSaveRow = async () => {
    if (!selectedTable || !schema || !editRow) return
    const primaryKey: Record<string, unknown> = {}
    for (const pk of schema.primaryKey) {
      if (editRow[pk] === undefined) return
      primaryKey[pk] = editRow[pk]
    }
    const data: Record<string, unknown> = {}
    for (const col of schema.columns) {
      if (schema.primaryKey.includes(col.name)) continue
      if (editForm[col.name] !== undefined) data[col.name] = editForm[col.name]
    }
    setSaving(true)
    setSaveError(null)
    try {
      const res = (await api.admin.updateDatabaseRow(selectedTable, {
        primaryKey,
        data,
      })) as { success?: boolean; updated?: number; error?: string }
      if (res?.success) {
        closeEdit()
        fetchRows(selectedTable, pagination.page, pagination.limit)
        fetchTables()
      } else {
        setSaveError(res?.error || "Update failed")
      }
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Update failed")
    } finally {
      setSaving(false)
    }
  }

  const openDelete = (row: Record<string, unknown>) => {
    setDeleteTarget(row)
    setDeleteError(null)
  }

  const closeDelete = () => {
    setDeleteTarget(null)
    setDeleteError(null)
  }

  const handleConfirmDelete = async () => {
    if (!selectedTable || !schema || !deleteTarget) return
    if (!schema.primaryKey.length) return
    const primaryKey: Record<string, unknown> = {}
    for (const pk of schema.primaryKey) {
      if (deleteTarget[pk] === undefined) {
        setDeleteError(`Missing primary key column: ${pk}`)
        return
      }
      primaryKey[pk] = deleteTarget[pk]
    }
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = (await api.admin.deleteDatabaseRow(selectedTable, {
        primaryKey,
      })) as { success?: boolean; deleted?: number; error?: string }
      if (res?.success) {
        closeDelete()
        fetchRows(selectedTable, pagination.page, pagination.limit)
        fetchTables()
      } else {
        setDeleteError(res?.error || "Delete failed")
      }
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setDeleting(false)
    }
  }

  const runSql = async () => {
    setSqlRunning(true)
    setSqlError(null)
    setSqlResult(null)
    try {
      const res = (await api.admin.runDatabaseSql(sqlQuery)) as {
        success?: boolean
        type?: "select" | "write"
        rows?: Record<string, unknown>[]
        rowCount?: number
        affectedRows?: number
        executionTimeMs?: number
        error?: string
      }
      if (res?.success) {
        setSqlResult({
          type: res.type || "select",
          rows: res.rows,
          rowCount: res.rowCount,
          affectedRows: res.affectedRows,
          executionTimeMs: res.executionTimeMs,
        })
      } else {
        setSqlError(res?.error || "Execution failed")
      }
    } catch (e: unknown) {
      setSqlError(e instanceof Error ? e.message : "Execution failed")
    } finally {
      setSqlRunning(false)
    }
  }

  const refreshAll = () => {
    fetchTables()
    fetchStats()
    if (selectedTable) {
      fetchSchema(selectedTable)
      fetchRows(selectedTable, pagination.page, pagination.limit)
    }
  }

  const editableColumns = schema
    ? schema.columns.filter((c) => !schema.primaryKey.includes(c.name))
    : []

  const deletePkSummary =
    deleteTarget && schema?.primaryKey.length
      ? schema.primaryKey
          .map((k) => `${k}=${deleteTarget[k] != null ? JSON.stringify(deleteTarget[k]) : "NULL"}`)
          .join(", ")
      : ""

  return (
    <TooltipProvider delayDuration={300}>
      <Tabs defaultValue="tables" className="flex flex-1 flex-col min-h-0 outline-none">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border/60 bg-gradient-to-b from-muted/30 to-background">
          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Database className="h-6 w-6 text-primary shrink-0" />
              Database
            </h1>
            <TabsList className="h-9 bg-background/80">
              <TabsTrigger value="tables" className="gap-2 text-sm">
                <TableIcon className="h-4 w-4" />
                Tables
              </TabsTrigger>
              <TabsTrigger value="sql" className="gap-2 text-sm">
                <Code2 className="h-4 w-4" />
                SQL
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-3">
            {!statsLoading && dbStats && (
              <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5" title="Database size">
                  <HardDrive className="h-4 w-4 shrink-0" />
                  {dbStats.bytes != null ? formatBytes(dbStats.bytes) : "—"}
                </span>
                <span className="flex items-center gap-1.5" title="Connections">
                  <Users className="h-4 w-4 shrink-0" />
                  {dbStats.currentConnections ?? "—"} / {dbStats.maxConnections ?? "—"}
                </span>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={tablesLoading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", tablesLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col min-h-0 min-w-0">
          <TabsContent
            value="tables"
            className="flex flex-1 flex-col min-h-0 min-w-0 mt-0 data-[state=inactive]:hidden"
          >
            {tablesError && (
              <div className="shrink-0 px-4 md:px-6 py-2">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{tablesError}</AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex flex-1 min-h-0 min-w-0">
              <aside
                className={cn(
                  "shrink-0 border-r border-border/60 bg-muted/15 flex flex-col min-h-0 transition-[width] duration-200 ease-out",
                  sidebarCollapsed ? "w-0 overflow-hidden border-r-0" : "w-[13.5rem] sm:w-60 lg:w-64"
                )}
              >
                <div className="shrink-0 p-2 border-b border-border/50 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search tables…"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      className="pl-8 h-9 text-sm bg-background"
                      aria-label="Filter tables"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1 min-h-0">
                  <div className="p-2 space-y-0.5 pb-3">
                    {tablesLoading ? (
                      [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <Skeleton key={i} className="h-11 w-full rounded-lg" />
                      ))
                    ) : (
                      filteredTables.map((t) => (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setSelectedTable(t.name)}
                          className={cn(
                            "w-full text-left rounded-lg px-3 py-2.5 text-sm transition-colors flex flex-col gap-0.5 border border-transparent",
                            selectedTable === t.name
                              ? "bg-primary text-primary-foreground shadow-sm border-primary/20"
                              : "hover:bg-muted/70 text-foreground"
                          )}
                        >
                          <span className="truncate font-mono font-medium text-[13px] leading-tight">{t.name}</span>
                          <span
                            className={cn(
                              "text-xs flex items-center gap-2 tabular-nums",
                              selectedTable === t.name ? "text-primary-foreground/85" : "text-muted-foreground"
                            )}
                          >
                            <span>{t.rowCount.toLocaleString()} rows</span>
                            {t.totalBytes != null && t.totalBytes > 0 && (
                              <span className="hidden lg:inline">· {formatBytes(t.totalBytes)}</span>
                            )}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
                {!tablesLoading && tables.length > 0 && (
                  <div className="shrink-0 p-2 border-t border-border/50 text-xs text-muted-foreground tabular-nums">
                    {filteredTables.length} of {tables.length} tables
                  </div>
                )}
              </aside>

              <div className="shrink-0 flex flex-col justify-center border-r border-border/60 bg-muted/10 px-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-md"
                      onClick={() => setSidebarCollapsed((c) => !c)}
                      aria-label={sidebarCollapsed ? "Expand table list" : "Collapse table list"}
                    >
                      {sidebarCollapsed ? (
                        <PanelLeft className="h-4 w-4" />
                      ) : (
                        <PanelLeftClose className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {sidebarCollapsed ? "Show tables" : "Hide tables"}
                  </TooltipContent>
                </Tooltip>
              </div>

              <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-background">
                {!selectedTable && (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 min-h-[12rem]">
                    <div className="text-center max-w-sm">
                      <List className="h-12 w-12 mx-auto mb-3 opacity-40" />
                      <p className="font-medium text-foreground">Select a table</p>
                      <p className="text-sm mt-1.5 leading-relaxed">
                        Pick a table on the left to inspect columns and browse rows. Only the grid scrolls—this panel
                        stays put.
                      </p>
                    </div>
                  </div>
                )}

                {selectedTable && (
                  <div className="flex flex-col flex-1 min-h-0 min-w-0 gap-0">
                    <div className="shrink-0 flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-border/50 bg-muted/20">
                      <div className="flex flex-wrap items-baseline gap-2 min-w-0 mr-auto">
                        <span className="font-mono font-semibold text-sm truncate">{selectedTable}</span>
                        {selectedMeta != null && (
                          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                            {selectedMeta.rowCount.toLocaleString()} rows
                            {selectedMeta.totalBytes != null && selectedMeta.totalBytes > 0 && (
                              <> · {formatBytes(selectedMeta.totalBytes)}</>
                            )}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setSchemaOpen((o) => !o)}
                      >
                        {schemaOpen ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                        Schema
                      </Button>
                      {schema && schema.columns.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                              <LayoutGrid className="h-3.5 w-3.5" />
                              Columns
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="max-h-[min(320px,50vh)] overflow-y-auto w-56">
                            <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {schema.columns.map((c) => (
                              <DropdownMenuCheckboxItem
                                key={c.name}
                                checked={columnsVisible[c.name] !== false}
                                onCheckedChange={(checked) =>
                                  setColumnsVisible((prev) => ({ ...prev, [c.name]: !!checked }))
                                }
                              >
                                <span className="font-mono text-xs">{c.name}</span>
                                <span className="text-muted-foreground text-xs ml-1">({c.type})</span>
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {schemaOpen && (
                      <div className="shrink-0 border-b border-border/50 bg-muted/25 max-h-[min(240px,32vh)] flex flex-col min-h-0">
                        <div className="px-3 sm:px-4 py-2 flex-1 min-h-0 overflow-auto">
                          {schemaLoading ? (
                            <Skeleton className="h-24 w-full rounded-md" />
                          ) : schema ? (
                            <div className="overflow-x-auto rounded-md border border-border/60 bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10 text-muted-foreground">#</TableHead>
                                    <TableHead>Column</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="w-20">Null</TableHead>
                                    <TableHead>Default</TableHead>
                                    <TableHead className="w-12">PK</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {schema.columns.map((c, i) => (
                                    <TableRow key={c.name} className="hover:bg-muted/40">
                                      <TableCell className="text-muted-foreground text-xs tabular-nums">{i + 1}</TableCell>
                                      <TableCell className="font-mono text-xs">{c.name}</TableCell>
                                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{c.type}</TableCell>
                                      <TableCell className="text-xs">{c.nullable ? "Yes" : "No"}</TableCell>
                                      <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                                        {c.default ?? "—"}
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {schema.primaryKey.includes(c.name) ? (
                                          <span className="text-primary font-medium">PK</span>
                                        ) : (
                                          "—"
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col flex-1 min-h-0 min-w-0 p-2 sm:p-3 gap-2">
                      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-card/40 px-3 py-2">
                        <p className="text-xs text-muted-foreground tabular-nums order-2 sm:order-1">
                          Page {pagination.page} of {Math.max(1, pagination.totalPages)} ·{" "}
                          {pagination.total.toLocaleString()} rows
                          {!hasPrimaryKey && (
                            <span className="ml-2 text-amber-600 dark:text-amber-500">· No PK — edit/delete disabled</span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Rows / page</span>
                            <Select
                              value={String(pagination.limit)}
                              onValueChange={(v) => setPageSize(parseInt(v, 10))}
                            >
                              <SelectTrigger className="h-8 w-[4.5rem] text-xs" aria-label="Rows per page">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {[25, 50, 100, 200].map((n) => (
                                  <SelectItem key={n} value={String(n)} className="text-xs">
                                    {n}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Separator orientation="vertical" className="hidden sm:block h-6" />
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={pagination.page <= 1 || rowsLoading}
                              onClick={() => goToPage(pagination.page - 1)}
                              aria-label="Previous page"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={pagination.page >= pagination.totalPages || rowsLoading || pagination.totalPages < 1}
                              onClick={() => goToPage(pagination.page + 1)}
                              aria-label="Next page"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col min-h-0 min-w-0 rounded-xl border border-border/80 bg-card/30 shadow-sm overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
                        <div className="flex-1 min-h-0 min-w-0 overflow-auto overscroll-contain">
                          {rowsLoading ? (
                            <div className="p-4 space-y-2">
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                              <Skeleton className="h-8 w-full" />
                            </div>
                          ) : (
                            <table className="w-max min-w-full caption-bottom text-sm border-collapse">
                              <thead className="sticky top-0 z-20">
                                <tr className="border-b border-border/80 bg-muted/95 dark:bg-muted/90 backdrop-blur-sm shadow-sm">
                                  {visibleColumns.map((c) => (
                                    <th
                                      key={c.name}
                                      scope="col"
                                      className="h-10 px-3 text-left align-middle font-mono text-xs font-semibold text-foreground whitespace-nowrap"
                                    >
                                      {c.name}
                                    </th>
                                  ))}
                                  <th
                                    scope="col"
                                    className="h-10 px-2 text-right align-middle font-medium text-xs text-muted-foreground w-[4.5rem] sticky right-0 z-30 bg-muted/95 dark:bg-muted/90 backdrop-blur-sm border-l border-border/60 shadow-[-4px_0_12px_-4px_rgba(0,0,0,0.08)]"
                                  >
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="[&_tr:last-child]:border-0">
                                {rows.map((row, idx) => (
                                  <tr
                                    key={rowKey(schema, row, idx)}
                                    className="border-b border-border/40 transition-colors hover:bg-muted/35"
                                  >
                                    {visibleColumns.map((c) => (
                                      <td
                                        key={c.name}
                                        className="font-mono text-xs px-3 py-2 align-top max-w-[min(280px,40vw)]"
                                      >
                                        <div
                                          className="truncate"
                                          title={row[c.name] != null ? String(row[c.name]) : "NULL"}
                                        >
                                          {row[c.name] != null ? (
                                            String(row[c.name])
                                          ) : (
                                            <span className="text-muted-foreground italic">NULL</span>
                                          )}
                                        </div>
                                      </td>
                                    ))}
                                    <td className="px-1 py-1 align-top sticky right-0 z-10 bg-background/95 dark:bg-background/90 border-l border-border/40 shadow-[-4px_0_12px_-8px_rgba(0,0,0,0.12)]">
                                      <div className="flex justify-end">
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 shrink-0"
                                              aria-label="Row actions"
                                            >
                                              <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end" className="w-44">
                                            <DropdownMenuItem onClick={() => openEdit(row)}>
                                              <Pencil className="h-4 w-4 mr-2" />
                                              Edit row
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              disabled={!hasPrimaryKey}
                                              className="text-destructive focus:text-destructive"
                                              onClick={() => openDelete(row)}
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Delete row
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {rows.length === 0 && !rowsLoading && (
                            <div className="py-16 text-center text-muted-foreground text-sm">No rows on this page.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </main>
            </div>
          </TabsContent>

          <TabsContent
            value="sql"
            className="flex flex-1 flex-col min-h-0 min-w-0 mt-0 data-[state=inactive]:hidden"
          >
            <div className="flex flex-1 flex-col min-h-0 px-4 md:px-6 py-3 max-w-5xl w-full mx-auto gap-3">
              <Card className="flex flex-1 flex-col min-h-0 border-border/70 shadow-sm overflow-hidden">
                <CardHeader className="shrink-0 space-y-1 pb-3">
                  <CardTitle className="text-base">Run SQL</CardTitle>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Single statement. <code className="text-xs bg-muted px-1 py-0.5 rounded">SELECT</code> returns a
                    scrollable result grid; writes report affected rows.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col min-h-0 gap-3 pt-0">
                  <div className="shrink-0 space-y-2">
                    <Label htmlFor="sql">Query</Label>
                    <textarea
                      id="sql"
                      className="w-full min-h-[140px] max-h-[28vh] resize-y rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder={'SELECT * FROM "user" LIMIT 10'}
                      spellCheck={false}
                    />
                  </div>
                  <div className="shrink-0">
                    <Button onClick={runSql} disabled={sqlRunning} size="sm" className="gap-2">
                      {sqlRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Run
                    </Button>
                  </div>
                  {sqlError && (
                    <Alert variant="destructive" className="shrink-0">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{sqlError}</AlertDescription>
                    </Alert>
                  )}
                  {sqlResult && (
                    <div className="flex flex-1 flex-col min-h-0 gap-2 border border-border/60 rounded-lg bg-muted/20 p-3 overflow-hidden">
                      <p className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {sqlResult.type === "select"
                          ? `${sqlResult.rowCount ?? 0} rows · ${sqlResult.executionTimeMs ?? 0} ms`
                          : `${sqlResult.affectedRows ?? 0} rows affected · ${sqlResult.executionTimeMs ?? 0} ms`}
                      </p>
                      {sqlResult.type === "select" && sqlResult.rows && sqlResult.rows.length > 0 && (
                        <div className="flex-1 min-h-0 rounded-md border border-border/50 bg-background overflow-auto">
                          <table className="w-max min-w-full text-sm border-collapse">
                            <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm border-b border-border">
                              <tr>
                                {Object.keys(sqlResult.rows[0]).map((k) => (
                                  <th
                                    key={k}
                                    className="h-9 px-3 text-left font-mono text-xs font-medium whitespace-nowrap"
                                  >
                                    {k}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sqlResult.rows.map((row, idx) => (
                                <tr key={idx} className="border-b border-border/30 hover:bg-muted/30">
                                  {Object.values(row).map((v, i) => (
                                    <td key={i} className="font-mono text-xs px-3 py-1.5 max-w-[220px]">
                                      <div className="truncate" title={v != null ? String(v) : "NULL"}>
                                        {v != null ? String(v) : <span className="text-muted-foreground">NULL</span>}
                                      </div>
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={!!editRow} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg max-h-[min(90vh,720px)] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
            <DialogTitle>Edit row</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-2 flex-1 min-h-0 overflow-y-auto space-y-4">
            {saveError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}
            {editableColumns.map((col) => (
              <div key={col.name} className="space-y-2">
                <Label className="font-mono text-sm">
                  {col.name}
                  <span className="text-muted-foreground font-normal ml-1">({col.type})</span>
                </Label>
                <Input
                  value={editForm[col.name] != null ? String(editForm[col.name]) : ""}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, [col.name]: e.target.value || null }))
                  }
                  placeholder={col.nullable ? "NULL" : ""}
                  className="font-mono text-sm"
                />
              </div>
            ))}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/60 shrink-0 bg-muted/20">
            <Button variant="outline" onClick={closeEdit} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveRow} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && closeDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this row?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>
                  This permanently removes the row from{" "}
                  <span className="font-mono font-medium text-foreground">{selectedTable}</span>. Related rows in other
                  tables may be removed by foreign-key rules.
                </p>
                {deletePkSummary && (
                  <div className="rounded-md border border-border bg-muted/40 px-3 py-2 font-mono text-xs break-all">
                    {deletePkSummary}
                  </div>
                )}
                {deleteError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{deleteError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete row"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
