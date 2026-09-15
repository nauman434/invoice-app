import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { getAnalytics } from "@/lib/repository";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await getAnalytics(userId);
  return NextResponse.json(data);
}
