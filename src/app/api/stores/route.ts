import { NextResponse } from "next/server";
import { LOCAL_STORES } from "@/lib/store-data";

export async function GET() {
  return NextResponse.json({ stores: LOCAL_STORES });
}
