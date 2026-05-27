import { NextRequest, NextResponse } from "next/server";
import { toggleRegularItem } from "@/lib/regular-items-store";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = toggleRegularItem(id);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}
