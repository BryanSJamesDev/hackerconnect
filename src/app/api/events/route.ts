import { NextResponse } from "next/server";
import { listEvents } from "@/lib/insforge/queries";

export async function GET() {
  try {
    const events = await listEvents();
    return NextResponse.json({ events });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
