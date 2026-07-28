import { NextRequest, NextResponse } from "next/server";
import { listProfiles, createProfile } from "@/lib/insforge/queries";

export async function GET() {
  try {
    const profiles = await listProfiles();
    return NextResponse.json({ profiles });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  try {
    const profile = await createProfile({
      name: body.name,
      qualification: body.qualification,
      interests: body.interests ?? [],
      bio: body.bio ?? "",
    });
    return NextResponse.json({ profile });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
