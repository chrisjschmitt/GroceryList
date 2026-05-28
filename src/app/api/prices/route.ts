import { NextRequest, NextResponse } from "next/server";
import { blobGetPrices, PriceData } from "@/lib/blob-store";
import { put } from "@vercel/blob";

export async function GET() {
  try {
    const prices = await blobGetPrices();
    return NextResponse.json(prices);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read prices", details: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.SCRAPER_API_KEY;

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const prices: PriceData = await request.json();

    await put("grocerylist/prices.json", JSON.stringify(prices), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });

    return NextResponse.json({ success: true, items: Object.keys(prices).length });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save prices", details: String(err) },
      { status: 500 }
    );
  }
}
