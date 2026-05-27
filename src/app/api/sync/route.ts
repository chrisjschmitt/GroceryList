import { NextRequest, NextResponse } from "next/server";
import { GroceryItem, RegularItem } from "@/lib/types";
import { blobGetGroceryItems, blobSetGroceryItems, blobGetRegularItems, blobSetRegularItems } from "@/lib/blob-store";

export async function GET() {
  const [groceryItems, regularItems] = await Promise.all([
    blobGetGroceryItems(),
    blobGetRegularItems(),
  ]);

  return NextResponse.json({ groceryItems, regularItems });
}

export async function PUT(request: NextRequest) {
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
}
