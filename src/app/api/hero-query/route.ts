import { NextRequest, NextResponse } from "next/server";
import { runHeroQuery } from "@/lib/pipeline/heroQuery";
import type { ConnectorType } from "@/lib/domain/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const profileSlug: string | undefined = body.profileSlug;
  const scopeToConnector: ConnectorType | undefined = body.scopeToConnector;

  if (!profileSlug) {
    return NextResponse.json({ error: "profileSlug is required" }, { status: 400 });
  }

  try {
    const result = await runHeroQuery(profileSlug, { scopeToConnector });
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
