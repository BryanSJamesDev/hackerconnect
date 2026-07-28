import { NextResponse } from "next/server";
import { getProfile, listChemistryConnections } from "@/lib/insforge/queries";

export async function GET(_req: Request, ctx: RouteContext<"/api/profiles/[id]">) {
  const { id } = await ctx.params;
  try {
    const [profile, connections] = await Promise.all([getProfile(id), listChemistryConnections(id)]);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    return NextResponse.json({ profile, connections });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
