"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "lucide-react"
import { api } from "@/lib/api"

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

export default function AdminDatabasePage() {
  const [tables, setTables] = useState<TableMeta[]>([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [tablesError, setTablesError] = useState<string | null>(null)
  const [tableSearch, setTableSearch] = useState("")
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [schema, setSchema] = useState<SchemaResult | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
  const [schemaOpen, setSchemaOpen] = useState(false)
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
  const [dbStats, setDbStats] = useState<DbStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM \"user\" LIMIT 10")
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
    async (tableName: string, page: number = 1) => {
      setRowsLoading(true)
      try {
        const res = (await api.admin.getDatabaseTableRows(tableName, {
          page,
          limit: pagination.limit,
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
    [pagination.limit]
  )

  useEffect(() => {
    if (!selectedTable) {
      setSchema(null)
      setRows([])
      setSchemaOpen(false)
      return
    }
    fetchSchema(selectedTable)
    fetchRows(selectedTable, 1)
  }, [selectedTable, fetchSchema, fetchRows])

  const visibleColumns = useMemo(() => {
    if (!schema) return []
    return schema.columns.filter((c) => columnsVisible[c.name] !== false)
  }, [schema, columnsVisible])

  const goToPage = (page: number) => {
    if (!selectedTable || page < 1 || page > pagination.totalPages) return
    fetchRows(selectedTable, page)
    setPagination((prev) => ({ ...prev, page }))
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
        fetchRows(selectedTable, pagination.page)
      } else {
        setSaveError(res?.error || "Update failed")
      }
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Update failed")
    } finally {
      setSaving(false)
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
      fetchRows(selectedTable, pagination.page)
    }
  }

  const editableColumns = schema
    ? schema.columns.filter((c) => !schema.primaryKey.includes(c.name))
    : []

  return (
    <Tabs defaultValue="tables" className="flex flex-col h-[calc(100vh-3.5rem)] min-h-0">
      {/* Top bar: title + DB stats + refresh */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-border/60 bg-background/95">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Database
          </h1>
          <TabsList className="h-9">
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
                <HardDrive className="h-4 w-4" />
                {dbStats.bytes != null ? formatBytes(dbStats.bytes) : "—"}
              </span>
              <span className="flex items-center gap-1.5" title="Connections">
                <Users className="h-4 w-4" />
                {dbStats.currentConnections ?? "—"} / {dbStats.maxConnections ?? "—"}
              </span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={tablesLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${tablesLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <TabsContent value="tables" className="flex-1 flex min-h-0 mt-0 data-[state=inactive]:hidden">
          {tablesError && (
            <div className="px-4 md:px-6 py-2">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{tablesError}</AlertDescription>
              </Alert>
            </div>
          )}
          <div className="flex-1 flex min-w-0">
            {/* Sidebar: tables */}
            <aside className="w-56 lg:w-64 shrink-0 border-r border-border/60 bg-muted/20 flex flex-col">
              <div className="p-2 border-b border-border/50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tables..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-8 h-9 text-sm bg-background"
                  />
                </div>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-0.5">
                  {tablesLoading ? (
                    [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <Skeleton key={i} className="h-11 w-full rounded-md" />
                    ))
                  ) : (
                    filteredTables.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => setSelectedTable(t.name)}
                        className={`w-full text-left rounded-lg px-3 py-2.5 text-sm font-mono transition-colors flex flex-col gap-0.5 ${
                          selectedTable === t.name
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted/80 text-foreground"
                        }`}
                      >
                        <span className="truncate font-medium">{t.name}</span>
                        <span className={`text-xs flex items-center gap-2 ${selectedTable === t.name ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          <span className="tabular-nums">{t.rowCount.toLocaleString()} rows</span>
                          {t.totalBytes != null && t.totalBytes > 0 && (
                            <span>· {formatBytes(t.totalBytes)}</span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
              {!tablesLoading && tables.length > 0 && (
                <div className="p-2 border-t border-border/50 text-xs text-muted-foreground">
                  {filteredTables.length} table{filteredTables.length !== 1 ? "s" : ""}
                </div>
              )}
            </aside>

            {/* Main: schema (optional) + rows */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {!selectedTable && (
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
                  <div className="text-center">
                    <List className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Select a table</p>
                    <p className="text-sm mt-1">Choose a table from the sidebar to view schema and data.</p>
                  </div>
                </div>
              )}
              {selectedTable && (
                <>
                  {/* Toolbar: table name, show schema, columns */}
                  <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border/50 bg-background/80">
                    <span className="font-mono font-semibold text-sm">{selectedTable}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setSchemaOpen((o) => !o)}
                    >
                      {schemaOpen ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      {schemaOpen ? "Hide" : "Show"} columns & types
                    </Button>
                    {schema && schema.columns.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                            <LayoutGrid className="h-4 w-4" />
                            Columns
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="max-h-[320px] overflow-y-auto w-56">
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

                  {/* Collapsible schema */}
                  {schemaOpen && (
                    <div className="shrink-0 border-b border-border/50 bg-muted/30">
                      <div className="px-4 py-3">
                        {schemaLoading ? (
                          <Skeleton className="h-20 w-full" />
                        ) : schema ? (
                          <ScrollArea className="w-full">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-8">#</TableHead>
                                  <TableHead>Column</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Nullable</TableHead>
                                  <TableHead>Default</TableHead>
                                  <TableHead className="w-14">PK</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {schema.columns.map((c, i) => (
                                  <TableRow key={c.name}>
                                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                                    <TableCell className="font-mono text-sm">{c.name}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{c.type}</TableCell>
                                    <TableCell>{c.nullable ? "Yes" : "No"}</TableCell>
                                    <TableCell className="text-muted-foreground text-xs max-w-[180px] truncate">
                                      {c.default ?? "—"}
                                    </TableCell>
                                    <TableCell>
                                      {schema.primaryKey.includes(c.name) ? (
                                        <span className="text-primary font-medium text-xs">PK</span>
                                      ) : (
                                        "—"
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Data grid */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2 border-b border-border/50">
                      <p className="text-xs text-muted-foreground">
                        Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total.toLocaleString()} rows
                      </p>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={pagination.page <= 1 || rowsLoading}
                          onClick={() => goToPage(pagination.page - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          disabled={pagination.page >= pagination.totalPages || rowsLoading}
                          onClick={() => goToPage(pagination.page + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <ScrollArea className="flex-1">
                      <div className="p-4">
                        {rowsLoading ? (
                          <Skeleton className="h-64 w-full" />
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {visibleColumns.map((c) => (
                                  <TableHead key={c.name} className="font-mono text-xs whitespace-nowrap">
                                    {c.name}
                                  </TableHead>
                                ))}
                                <TableHead className="w-14">Edit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rows.map((row, idx) => (
                                <TableRow key={idx}>
                                  {visibleColumns.map((c) => (
                                    <TableCell
                                      key={c.name}
                                      className="font-mono text-xs max-w-[220px] truncate align-top"
                                      title={row[c.name] != null ? String(row[c.name]) : "NULL"}
                                    >
                                      {row[c.name] != null ? String(row[c.name]) : (
                                        <span className="text-muted-foreground">NULL</span>
                                      )}
                                    </TableCell>
                                  ))}
                                  <TableCell className="align-top">
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(row)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                        {rows.length === 0 && !rowsLoading && (
                          <div className="py-12 text-center text-muted-foreground text-sm">
                            No rows in this page.
                          </div>
                        )}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </div>
                </>
              )}
            </main>
          </div>
        </TabsContent>

        <TabsContent value="sql" className="flex-1 min-h-0 mt-0 data-[state=inactive]:hidden overflow-auto">
          <div className="p-4 md:p-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Run SQL</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Single statement only. SELECT returns rows; INSERT/UPDATE/DELETE return affected count.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sql">Query</Label>
                  <textarea
                    id="sql"
                    className="mt-2 w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 font-mono text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder={'SELECT * FROM "user" LIMIT 10'}
                  />
                </div>
                <Button onClick={runSql} disabled={sqlRunning}>
                  {sqlRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                  Run
                </Button>
                {sqlError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{sqlError}</AlertDescription>
                  </Alert>
                )}
                {sqlResult && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {sqlResult.type === "select"
                        ? `${sqlResult.rowCount ?? 0} rows · ${sqlResult.executionTimeMs ?? 0} ms`
                        : `${sqlResult.affectedRows ?? 0} rows affected · ${sqlResult.executionTimeMs ?? 0} ms`}
                    </p>
                    {sqlResult.type === "select" && sqlResult.rows && sqlResult.rows.length > 0 && (
                      <ScrollArea className="w-full border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {Object.keys(sqlResult.rows[0]).map((k) => (
                                <TableHead key={k} className="font-mono text-xs">
                                  {k}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sqlResult.rows.map((row, idx) => (
                              <TableRow key={idx}>
                                {Object.values(row).map((v, i) => (
                                  <TableCell key={i} className="font-mono text-xs max-w-[200px] truncate">
                                    {v != null ? String(v) : "NULL"}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                      </ScrollArea>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </div>

      <Dialog open={!!editRow} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit row</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                  className="font-mono"
                />
              </div>
            ))}
          </div>
          <DialogFooter>
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
    </Tabs>
  )
}
