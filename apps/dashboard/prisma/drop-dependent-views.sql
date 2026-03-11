-- Run this once before `npx prisma db push` if you get "view lead_analytics depends on table leads".
-- Execute in Supabase SQL Editor (or psql) connected to your database.

DROP VIEW IF EXISTS "lead_analytics" CASCADE;
