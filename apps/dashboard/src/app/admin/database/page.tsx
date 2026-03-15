"use client"

import { useCallback, useEffect, useState } from "react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
} from "lucide-react"
import { api } from "@/lib/api"

type TableMeta = { name: string; rowCount: number }
type ColumnMeta = { name: string; type: string; nullable: boolean; default: string | null }
type SchemaResult = {
  success: boolean
  tableName: string
  columns: ColumnMeta[]
  primaryKey: string[]
}

export default function AdminDatabasePage() {
  const [tables, setTables] = useState<TableMeta[]>([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [tablesError, setTablesError] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [schema, setSchema] = useState<SchemaResult | null>(null)
  const [schemaLoading, setSchemaLoading] = useState(false)
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

  const fetchTables = useCallback(async () => {
    setTablesLoading(true)
    setTablesError(null)
    try {
      const res = await api.admin.getDatabaseTables() as { success?: boolean; tables?: TableMeta[]; error?: string }
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
  }, [fetchTables])

  const fetchSchema = useCallback(async (tableName: string) => {
    setSchemaLoading(true)
    try {
      const res = await api.admin.getDatabaseTableSchema(tableName) as SchemaResult & { error?: string }
      if (res?.success && res.columns) {
        setSchema({
          success: true,
          tableName: res.tableName,
          columns: res.columns,
          primaryKey: res.primaryKey || [],
        })
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
        const res = await api.admin.getDatabaseTableRows(tableName, { page, limit: pagination.limit }) as {
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
      return
    }
    fetchSchema(selectedTable)
    fetchRows(selectedTable, 1)
  }, [selectedTable, fetchSchema, fetchRows])

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
      const res = await api.admin.updateDatabaseRow(selectedTable, { primaryKey, data }) as { success?: boolean; updated?: number; error?: string }
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
      const res = await api.admin.runDatabaseSql(sqlQuery) as {
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

  const editableColumns = schema
    ? schema.columns.filter((c) => !schema.primaryKey.includes(c.name))
    : []

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-7 w-7 text-primary" />
            Database
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Browse tables, edit rows, and run SQL (admin only).
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTables} disabled={tablesLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${tablesLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="tables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tables" className="gap-2">
            <TableIcon className="h-4 w-4" />
            Tables
          </TabsTrigger>
          <TabsTrigger value="sql" className="gap-2">
            <Code2 className="h-4 w-4" />
            SQL Runner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          {tablesError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{tablesError}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Public tables</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {tablesLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <ScrollArea className="h-[320px]">
                    <div className="p-2 space-y-0.5">
                      {tables.map((t) => (
                        <Button
                          key={t.name}
                          variant={selectedTable === t.name ? "secondary" : "ghost"}
                          className="w-full justify-between font-mono text-sm"
                          onClick={() => setSelectedTable(t.name)}
                        >
                          <span className="truncate">{t.name}</span>
                          <span className="text-muted-foreground text-xs tabular-nums ml-2">
                            {t.rowCount.toLocaleString()}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-4">
              {!selectedTable && (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    Select a table to view schema and data.
                  </CardContent>
                </Card>
              )}
              {selectedTable && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-mono">{selectedTable}</CardTitle>
                      <p className="text-xs text-muted-foreground">Columns & types</p>
                    </CardHeader>
                    <CardContent>
                      {schemaLoading ? (
                        <Skeleton className="h-24 w-full" />
                      ) : schema ? (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Column</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Nullable</TableHead>
                                <TableHead>Default</TableHead>
                                <TableHead className="w-20">PK</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {schema.columns.map((c) => (
                                <TableRow key={c.name}>
                                  <TableCell className="font-mono text-sm">{c.name}</TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{c.type}</TableCell>
                                  <TableCell>{c.nullable ? "Yes" : "No"}</TableCell>
                                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                                    {c.default ?? "—"}
                                  </TableCell>
                                  <TableCell>
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
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle className="text-base">Rows</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total.toLocaleString()} total
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page <= 1 || rowsLoading}
                          onClick={() => goToPage(pagination.page - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page >= pagination.totalPages || rowsLoading}
                          onClick={() => goToPage(pagination.page + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      {rowsLoading ? (
                        <div className="p-6">
                          <Skeleton className="h-48 w-full" />
                        </div>
                      ) : (
                        <ScrollArea className="w-full">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {schema?.columns.map((c) => (
                                  <TableHead key={c.name} className="font-mono text-xs whitespace-nowrap">
                                    {c.name}
                                  </TableHead>
                                ))}
                                <TableHead className="w-16">Edit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rows.map((row, idx) => (
                                <TableRow key={idx}>
                                  {schema?.columns.map((c) => (
                                    <TableCell key={c.name} className="font-mono text-xs max-w-[200px] truncate">
                                      {row[c.name] != null ? String(row[c.name]) : "NULL"}
                                    </TableCell>
                                  ))}
                                  <TableCell>
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          {rows.length === 0 && !rowsLoading && (
                            <div className="py-8 text-center text-muted-foreground text-sm">
                              No rows in this page.
                            </div>
                          )}
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sql" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Run SQL</CardTitle>
              <p className="text-sm text-muted-foreground">
                One statement at a time. SELECT returns rows; INSERT/UPDATE/DELETE return affected count.
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
                  placeholder="SELECT * FROM user LIMIT 10"
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
                        </ScrollArea>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
    </div>
  )
}
