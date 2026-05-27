import { NextRequest, NextResponse } from "next/server";
import { parseCsv } from "@/lib/csv-parser";
import {
  getRegularItems,
  setRegularItems,
  clearRegularItems,
} from "@/lib/regular-items-store";

export async function GET() {
  const items = await getRegularItems();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "File must be a .csv file" }, { status: 400 });
    }

    const content = await file.text();
    const { items, errors } = parseCsv(content);

    if (items.length === 0) {
      return NextResponse.json(
        { error: "No valid items found in CSV", details: errors },
        { status: 400 }
      );
    }

    await setRegularItems(items);
    return NextResponse.json({ items, errors }, { status: 201 });
  }

  return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
}

export async function DELETE() {
  await clearRegularItems();
  return NextResponse.json({ success: true });
}
