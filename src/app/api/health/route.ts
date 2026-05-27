import { NextResponse } from "next/server";
import { put, get, list } from "@vercel/blob";

export async function GET() {
  const results: Record<string, unknown> = {
    tokenSet: !!process.env.BLOB_READ_WRITE_TOKEN,
    storeIdSet: !!process.env.BLOB_STORE_ID,
  };

  try {
    const writeResult = await put("grocerylist/_health-check.json", JSON.stringify({ ok: true, ts: Date.now() }), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
    results.write = { success: true, url: writeResult.url, pathname: writeResult.pathname };
  } catch (err) {
    results.write = { success: false, error: String(err) };
  }

  try {
    const response = await get("grocerylist/_health-check.json", { access: "private" });
    if (response && response.statusCode === 200) {
      const text = await new Response(response.stream).text();
      results.read = { success: true, content: text };
    } else {
      results.read = { success: false, error: "Blob not found or empty" };
    }
  } catch (err) {
    results.read = { success: false, error: String(err) };
  }

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
