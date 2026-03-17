import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const TABLE_NAME_REGEX = /^[a-z0-9_]+$/;

function adminOnly(req: Request, res: Response, next: () => void) {
  if ((req as any).user?.role !== "admin") {
    res.status(403).json({ success: false, error: "Admin access required" });
    return;
  }
  next();
}

/** Validate table name exists in public schema and return it (lowercase). */
async function validateTableName(tableName: string): Promise<string | null> {
  if (!TABLE_NAME_REGEX.test(tableName)) return null;
  const rows = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    tableName
  );
  return rows.length > 0 ? rows[0].table_name : null;
}

/** GET /api/admin/database/tables — list public tables with row counts */
router.get("/tables", requireAuth, adminOnly, async (_req: Request, res: Response) => {
  try {
    const tables = await prisma.$queryRawUnsafe<
      {
        table_name: string;
        total_bytes: bigint | null;
        table_bytes: bigint | null;
        index_bytes: bigint | null;
      }[]
    >(
      `SELECT
         c.relname AS table_name,
         pg_total_relation_size(c.oid) AS total_bytes,
         pg_relation_size(c.oid) AS table_bytes,
         pg_indexes_size(c.oid) AS index_bytes
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
       ORDER BY c.relname`
    );

    const withCounts = await Promise.all(
      tables.map(async (t) => {
        let count = 0;
        try {
          const sql = `SELECT COUNT(*)::bigint as count FROM "${t.table_name}"`;
          const r = await prisma.$queryRawUnsafe<[{ count: bigint }]>(sql);
          count = Number(r[0]?.count ?? 0);
        } catch {
          // ignore
        }
        return {
          name: t.table_name,
          rowCount: count,
          totalBytes: t.total_bytes != null ? Number(t.total_bytes) : null,
          tableBytes: t.table_bytes != null ? Number(t.table_bytes) : null,
          indexBytes: t.index_bytes != null ? Number(t.index_bytes) : null,
        };
      })
    );

    res.json({ success: true, tables: withCounts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to list tables" });
  }
});

/** GET /api/admin/database/stats — database-level stats */
router.get("/stats", requireAuth, adminOnly, async (_req: Request, res: Response) => {
  try {
    const sizeRows = await prisma.$queryRawUnsafe<[{ pg_database_size: bigint | null }]>(
      "SELECT pg_database_size(current_database()) AS pg_database_size"
    );
    const dbBytes = sizeRows?.[0]?.pg_database_size != null ? Number(sizeRows[0].pg_database_size) : null;

    const connRows = await prisma.$queryRawUnsafe<[{ current_connections: bigint | null }]>(
      "SELECT COUNT(*)::bigint AS current_connections FROM pg_stat_activity"
    );
    const currentConnections =
      connRows?.[0]?.current_connections != null ? Number(connRows[0].current_connections) : null;

    const maxConnRows = await prisma.$queryRawUnsafe<[{ max_connections: string | null }]>(
      "SELECT current_setting('max_connections') AS max_connections"
    );
    const maxConnections = maxConnRows?.[0]?.max_connections != null ? Number(maxConnRows[0].max_connections) : null;

    res.json({
      success: true,
      database: {
        bytes: dbBytes,
        currentConnections,
        maxConnections,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to get database stats" });
  }
});

function paramTableName(req: Request): string {
  const p = req.params.tableName;
  return Array.isArray(p) ? (p[0] ?? "") : (p ?? "");
}

/** GET /api/admin/database/tables/:tableName/schema — columns + primary key */
router.get("/tables/:tableName/schema", requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const tableName = paramTableName(req);
    const valid = await validateTableName(tableName);
    if (!valid) {
      res.status(400).json({ success: false, error: "Invalid or unknown table" });
      return;
    }
    const columns = await prisma.$queryRawUnsafe<
      { column_name: string; data_type: string; is_nullable: string; column_default: string | null }[]
    >(
      `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
      valid
    );
    const pkRows = await prisma.$queryRawUnsafe<
      { column_name: string }[]
    >(
      `SELECT kcu.column_name FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY kcu.ordinal_position`,
      valid
    );
    const primaryKey = pkRows.map((r) => r.column_name);
    res.json({
      success: true,
      tableName: valid,
      columns: columns.map((c) => ({
        name: c.column_name,
        type: c.data_type,
        nullable: c.is_nullable === "YES",
        default: c.column_default,
      })),
      primaryKey,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to get schema" });
  }
});

/** GET /api/admin/database/tables/:tableName/rows?page=1&limit=50 */
router.get("/tables/:tableName/rows", requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const tableName = paramTableName(req);
    const valid = await validateTableName(tableName);
    if (!valid) {
      res.status(400).json({ success: false, error: "Invalid or unknown table" });
      return;
    }
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const offset = (page - 1) * limit;
    const rowsSql = `SELECT * FROM "${valid}" ORDER BY 1 LIMIT $1 OFFSET $2`;
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(rowsSql, limit, offset);
    const countSql = `SELECT COUNT(*)::bigint as count FROM "${valid}"`;
    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(countSql);
    const total = Number(countResult[0]?.count ?? 0);
    const serialized = rows.map((row) => {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (v instanceof Date) out[k] = v.toISOString();
        else if (typeof v === "bigint") out[k] = String(v);
        else out[k] = v;
      }
      return out;
    });
    res.json({
      success: true,
      rows: serialized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to get rows" });
  }
});

/** PATCH /api/admin/database/tables/:tableName/rows — update one row by primary key */
router.patch("/tables/:tableName/rows", requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const tableName = paramTableName(req);
    const valid = await validateTableName(tableName);
    if (!valid) {
      res.status(400).json({ success: false, error: "Invalid or unknown table" });
      return;
    }
    const body = req.body as { primaryKey: Record<string, unknown>; data: Record<string, unknown> };
    if (!body.primaryKey || typeof body.primaryKey !== "object" || !body.data || typeof body.data !== "object") {
      res.status(400).json({ success: false, error: "primaryKey and data required" });
      return;
    }
    const columns = await prisma.$queryRawUnsafe<
      { column_name: string }[]
    >(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      valid
    );
    const columnSet = new Set(columns.map((c) => c.column_name));
    const pkRows = await prisma.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT kcu.column_name FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY kcu.ordinal_position`,
      valid
    );
    const primaryKey = pkRows.map((r) => r.column_name);
    if (primaryKey.length === 0) {
      res.status(400).json({ success: false, error: "Table has no primary key; row update not supported" });
      return;
    }
    for (const pk of primaryKey) {
      if (!(pk in body.primaryKey)) {
        res.status(400).json({ success: false, error: `Missing primary key: ${pk}` });
        return;
      }
    }
    const updates = Object.entries(body.data).filter(([k]) => columnSet.has(k) && !primaryKey.includes(k));
    if (updates.length === 0) {
      res.json({ success: true, updated: 0 });
      return;
    }
    const setClause = updates.map(([col], i) => `"${col}" = $${i + 1}`).join(", ");
    const whereClause = primaryKey.map((pk, i) => `"${pk}" = $${updates.length + i + 1}`).join(" AND ");
    const values = [...updates.map(([, v]) => v), ...primaryKey.map((pk) => body.primaryKey[pk])];
    const sql = `UPDATE "${valid}" SET ${setClause} WHERE ${whereClause}`;
    const result = await prisma.$executeRawUnsafe(sql, ...values);
    res.json({ success: true, updated: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message ?? "Failed to update row" });
  }
});

/** POST /api/admin/database/sql — run raw SQL (admin only; single statement; 10s timeout) */
router.post("/sql", requireAuth, adminOnly, async (req: Request, res: Response) => {
  try {
    const { query } = req.body as { query?: string };
    if (typeof query !== "string" || !query.trim()) {
      res.status(400).json({ success: false, error: "query (string) required" });
      return;
    }
    const trimmed = query.trim();
    if (trimmed.includes(";") && trimmed.split(";").filter((s) => s.trim()).length > 1) {
      res.status(400).json({ success: false, error: "Only one statement allowed" });
      return;
    }
    const start = Date.now();
    const isSelect = /^\s*(\/\*.*\*\/)?\s*SELECT\b/i.test(trimmed);
    if (isSelect) {
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(trimmed);
      const serialized = (rows as Record<string, unknown>[]).map((row) => {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          if (v instanceof Date) out[k] = v.toISOString();
          else if (typeof v === "bigint") out[k] = String(v);
          else out[k] = v;
        }
        return out;
      });
      res.json({
        success: true,
        type: "select",
        rows: serialized,
        rowCount: serialized.length,
        executionTimeMs: Date.now() - start,
      });
    } else {
      const affected = await prisma.$executeRawUnsafe(trimmed);
      res.json({
        success: true,
        type: "write",
        affectedRows: affected,
        executionTimeMs: Date.now() - start,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message ?? "SQL execution failed",
    });
  }
});

export { router as adminDatabaseRouter };
