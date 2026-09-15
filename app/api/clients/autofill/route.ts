import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/session";
import { getClientAutofill, listClientNames } from "@/lib/repository";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");

  if (!name) {
    const names = await listClientNames(userId);
    return NextResponse.json({ names });
  }

  const result = await getClientAutofill(userId, name);
  return NextResponse.json(result);
}
