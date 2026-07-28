import { NextRequest, NextResponse } from "next/server";
import { submitFeedback } from "@/lib/insforge/queries";

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    await submitFeedback({
      eventId: body.eventId,
      profileId: body.profileId,
      teammateId: body.teammateId,
      outcome: body.outcome,
      note: body.note,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
