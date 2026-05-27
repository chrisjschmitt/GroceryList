import { NextRequest, NextResponse } from "next/server";
import { getItems, addItem, clearChecked } from "@/lib/grocery-store";

export async function GET() {
  const items = getItems();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, quantity, unit } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const item = addItem(
    name.trim(),
    typeof quantity === "number" ? quantity : 1,
    typeof unit === "string" ? unit : "unit"
  );

  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE() {
  const removed = clearChecked();
  return NextResponse.json({ removed });
}
