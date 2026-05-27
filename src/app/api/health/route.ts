import { NextResponse } from "next/server";
import { put, head, list } from "@vercel/blob";

export async function GET() {
  const results: Record<string, unknown> = {
    tokenSet: !!process.env.BLOB_READ_WRITE_TOKEN,
    tokenPrefix: process.env.BLOB_READ_WRITE_TOKEN?.slice(0, 10) + "...",
  };

  // Test write
  try {
    const writeResult = await put("grocerylist/_health-check.json", JSON.stringify({ ok: true, ts: Date.now() }), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    results.write = { success: true, url: writeResult.url, pathname: writeResult.pathname };
  } catch (err) {
    results.write = { success: false, error: String(err) };
  }

  // Test read
  try {
    const metadata = await head("grocerylist/_health-check.json");
    results.read = { success: true, url: metadata.url, size: metadata.size };
  } catch (err) {
    results.read = { success: false, error: String(err) };
  }

  // Test list
  try {
    const blobs = await list({ prefix: "grocerylist/" });
    results.list = {
      success: true,
      count: blobs.blobs.length,
      blobs: blobs.blobs.map((b) => ({ pathname: b.pathname, size: b.size })),
    };
  } catch (err) {
    results.list = { success: false, error: String(err) };
  }

  return NextResponse.json(results);
}
