import { readFileSync } from "node:fs";
import path from "node:path";
import { AGENT_INTENTS } from "../src/lib/insforge/intents";

async function rawSql<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
  const res = await fetch(`${process.env.INSFORGE_BASE_URL}/api/database/advance/rawsql`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.INSFORGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, params }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`InsForge rawsql failed: ${JSON.stringify(json)}`);
  }
  return json.rows as T[];
}

async function main() {
  const schemaPath = path.join(__dirname, "../src/lib/insforge/schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");

  const withoutComments = schema
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");

  const statements = withoutComments
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    console.log(`Applying: ${statement.slice(0, 60).replace(/\n/g, " ")}...`);
    await rawSql(statement);
  }

  console.log(`Applied ${statements.length} schema statements.`);

  for (const intent of AGENT_INTENTS) {
    await rawSql(
      `insert into public.agent_intents (id, name, description, reads, writes, config)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update set
         name = excluded.name,
         description = excluded.description,
         reads = excluded.reads,
         writes = excluded.writes,
         config = excluded.config`,
      [
        intent.id,
        intent.name,
        intent.description,
        intent.reads,
        intent.writes,
        JSON.stringify(intent.config),
      ]
    );
    console.log(`Upserted intent: ${intent.id}`);
  }

  console.log("InsForge setup complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
