import { NextRequest, NextResponse } from "next/server";
import { blobGetScrapeConfig, blobSetScrapeConfig, ScrapeConfig } from "@/lib/blob-store";

export async function GET() {
  try {
    const config = await blobGetScrapeConfig();
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read scrape config", details: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const config: ScrapeConfig = await request.json();
    await blobSetScrapeConfig(config);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save scrape config", details: String(err) },
      { status: 500 }
    );
  }
}
