#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const CLIENT_PATH = path.join(ROOT, "src/integrations/supabase/client.ts");
const TYPES_PATH = path.join(ROOT, "src/integrations/supabase/types.ts");
const PAGE_SIZE = 1000;

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return [
    d.getUTCFullYear(),
    pad(d.getUTCMonth() + 1),
    pad(d.getUTCDate()),
    "_",
    pad(d.getUTCHours()),
    pad(d.getUTCMinutes()),
    pad(d.getUTCSeconds()),
    "Z",
  ].join("");
}

function parseClientConfig(clientTs) {
  const urlMatch = clientTs.match(/const SUPABASE_URL = "([^"]+)";/);
  const keyMatch = clientTs.match(/const SUPABASE_PUBLISHABLE_KEY = "([^"]+)";/);
  if (!urlMatch || !keyMatch) {
    throw new Error("Could not parse SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY from client.ts");
  }
  return { url: urlMatch[1], anonKey: keyMatch[1] };
}

function parsePublicTables(typesTs) {
  const tablesBlockMatch = typesTs.match(/public:\s*{\s*Tables:\s*{([\s\S]*?)}\s*Views:/);
  if (!tablesBlockMatch) {
    throw new Error("Could not parse public.Tables from types.ts");
  }
  const block = tablesBlockMatch[1];
  const names = [...block.matchAll(/^\s{6}([a-zA-Z0-9_]+):\s*{/gm)].map((m) => m[1]);
  return [...new Set(names)].sort();
}

async function fetchTableRows({ url, anonKey, table }) {
  let offset = 0;
  const allRows = [];

  while (true) {
    const endpoint = new URL(`${url}/rest/v1/${table}`);
    endpoint.searchParams.set("select", "*");
    endpoint.searchParams.set("limit", String(PAGE_SIZE));
    endpoint.searchParams.set("offset", String(offset));

    const res = await fetch(endpoint, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        ok: false,
        status: res.status,
        error: text || res.statusText,
      };
    }

    const page = await res.json();
    if (!Array.isArray(page)) {
      return {
        ok: false,
        status: res.status,
        error: "Unexpected response body (expected array rows)",
      };
    }

    allRows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return { ok: true, rows: allRows };
}

async function main() {
  const [clientTs, typesTs] = await Promise.all([
    fs.readFile(CLIENT_PATH, "utf8"),
    fs.readFile(TYPES_PATH, "utf8"),
  ]);

  const { url, anonKey } = parseClientConfig(clientTs);
  const tables = parsePublicTables(typesTs);
  const stamp = nowStamp();
  const backupDir = path.join(ROOT, "backups", `anon_export_${stamp}`);
  const tablesDir = path.join(backupDir, "tables");

  await fs.mkdir(tablesDir, { recursive: true });
  await fs.writeFile(path.join(backupDir, "schema_from_types.ts"), typesTs, "utf8");

  const report = {
    generated_at_utc: new Date().toISOString(),
    project_url: url,
    mode: "anon-key-export",
    limitations: [
      "Only data exposed to anon role is included.",
      "RLS-protected/private data is not included.",
      "DB roles, grants, policies, triggers, extensions, and full SQL schema are not included.",
    ],
    totals: {
      table_candidates: tables.length,
      exported_tables: 0,
      blocked_or_failed_tables: 0,
      exported_rows: 0,
    },
    tables: [],
  };

  for (const table of tables) {
    const result = await fetchTableRows({ url, anonKey, table });
    if (result.ok) {
      const rowCount = result.rows.length;
      report.tables.push({
        table,
        status: "exported",
        row_count: rowCount,
        file: `tables/${table}.json`,
      });
      report.totals.exported_tables += 1;
      report.totals.exported_rows += rowCount;
      await fs.writeFile(
        path.join(tablesDir, `${table}.json`),
        JSON.stringify(result.rows, null, 2),
        "utf8"
      );
      continue;
    }

    report.tables.push({
      table,
      status: "blocked_or_failed",
      http_status: result.status,
      error: result.error,
    });
    report.totals.blocked_or_failed_tables += 1;
  }

  await fs.writeFile(path.join(backupDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ backup_dir: backupDir, summary: report.totals }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});