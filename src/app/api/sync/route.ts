import { NextRequest, NextResponse } from "next/server";
import { GroceryItem, RegularItem } from "@/lib/types";
import { blobGetGroceryItems, blobSetGroceryItems, blobGetRegularItems, blobSetRegularItems } from "@/lib/blob-store";

export async function GET() {
  try {
    const [groceryItems, regularItems] = await Promise.all([
      blobGetGroceryItems(),
      blobGetRegularItems(),
    ]);

    return NextResponse.json({ groceryItems, regularItems });
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
    const { groceryItems, regularItems } = body as {
      groceryItems?: GroceryItem[];
      regularItems?: RegularItem[];
    };

    if (groceryItems !== undefined) {
      await blobSetGroceryItems(groceryItems);
    }
    if (regularItems !== undefined) {
      await blobSetRegularItems(regularItems);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to write to blob store", details: String(err) },
      { status: 500 }
    );
  }
}
