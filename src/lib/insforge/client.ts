import { createAdminClient } from "@insforge/sdk";

let client: ReturnType<typeof createAdminClient> | null = null;

/**
 * Server-only admin client for InsForge (our Postgres-backed store for
 * profiles, events, chemistry edges, feedback, and agent intent profiles).
 * Never import this from client components.
 */
export function insforge() {
  if (!client) {
    client = createAdminClient({
      baseUrl: process.env.INSFORGE_BASE_URL,
      apiKey: process.env.INSFORGE_API_KEY!,
    });
  }
  return client;
}

/**
 * Runs raw SQL against InsForge's Postgres instance. Used for schema setup
 * (see scripts/setup-insforge.ts) where DDL isn't exposed through the
 * table-scoped SDK/REST surface.
 */
export async function rawSql<T = unknown>(
  query: string,
  params: unknown[] = []
): Promise<T[]> {
  const res = await fetch(
    `${process.env.INSFORGE_BASE_URL}/api/database/advance/rawsql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.INSFORGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, params }),
    }
  );
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`InsForge rawsql failed: ${JSON.stringify(json)}`);
  }
  return json.rows as T[];
}
