import { NextRequest, NextResponse } from "next/server";
import { GroceryItem, RegularItem } from "@/lib/types";
import {
  blobGetGroceryItems, blobSetGroceryItems,
  blobGetRegularItems, blobSetRegularItems,
  blobGetSyncMeta, blobSetSyncMeta,
} from "@/lib/blob-store";

export async function GET() {
  try {
    const [groceryItems, regularItems, syncMeta] = await Promise.all([
      blobGetGroceryItems(),
      blobGetRegularItems(),
      blobGetSyncMeta(),
    ]);

    return NextResponse.json({ groceryItems, regularItems, syncMeta });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read from blob store", details: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { groceryItems, regularItems, deviceName } = body as {
      groceryItems?: GroceryItem[];
      regularItems?: RegularItem[];
      deviceName?: string;
    };

    const writes: Promise<void>[] = [];

    if (groceryItems !== undefined) {
      writes.push(blobSetGroceryItems(groceryItems));
    }
    if (regularItems !== undefined) {
      writes.push(blobSetRegularItems(regularItems));
    }

    writes.push(blobSetSyncMeta({
      lastSavedBy: deviceName || "Unknown device",
      lastSavedAt: new Date().toISOString(),
    }));

    await Promise.all(writes);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to write to blob store", details: String(err) },
      { status: 500 }
    );
  }
}
