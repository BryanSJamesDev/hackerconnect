import type { ConnectorType } from "@/lib/domain/types";

const HYDRADB_BASE_URL = "https://api.hydradb.com";
const API_VERSION = "2";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${requireEnv("HYDRADB_API_KEY")}`,
    "API-Version": API_VERSION,
  };
}

function database(): string {
  return requireEnv("HYDRADB_DATABASE");
}

export interface AppKnowledgeRecord {
  id: string;
  title: string;
  connector: ConnectorType;
  text: string;
  metadata: Record<string, unknown>;
}

/**
 * Seeds a synthetic record into HydraDB's context graph, tagged with its
 * originating connector in `metadata.connector` so queries can later be
 * scoped to a single source (the hackathon's required "kill shot" demo).
 */
export async function ingestRecords(
  collection: string,
  records: AppKnowledgeRecord[]
): Promise<void> {
  const appKnowledge = records.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.connector,
    content: { text: r.text },
    metadata: { ...r.metadata, connector: r.connector },
  }));

  const form = new FormData();
  form.set("type", "knowledge");
  form.set("database", database());
  form.set("collection", collection);
  form.set("app_knowledge", JSON.stringify(appKnowledge));

  const res = await fetch(`${HYDRADB_BASE_URL}/context/ingest`, {
    method: "POST",
    headers: authHeaders(),
    body: form,
  });

  const body = await res.json();
  if (!res.ok || body.success === false) {
    throw new Error(`HydraDB ingest failed: ${JSON.stringify(body)}`);
  }
}

export interface HydraQueryOptions {
  collection: string;
  query: string;
  /** Restrict results to a single connector (used for the kill-shot demo). */
  scopeToConnector?: ConnectorType;
  maxResults?: number;
}

export interface HydraChunk {
  chunk_content: string;
  source_title: string;
  relevancy_score: number;
  metadata?: Record<string, unknown>;
}

export interface HydraQueryResponse {
  chunks: HydraChunk[];
  sources: { id: string; title: string; metadata?: Record<string, unknown> }[];
}

export async function queryContext(
  opts: HydraQueryOptions
): Promise<HydraQueryResponse> {
  const body: Record<string, unknown> = {
    database: database(),
    collection: opts.collection,
    query: opts.query,
    type: "all",
    max_results: opts.maxResults ?? 25,
  };

  if (opts.scopeToConnector) {
    body.metadata_filters = { connector: opts.scopeToConnector };
  }

  const res = await fetch(`${HYDRADB_BASE_URL}/query`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(`HydraDB query failed: ${JSON.stringify(json)}`);
  }
  return json.data as HydraQueryResponse;
}
