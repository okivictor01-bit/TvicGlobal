import { NextResponse } from "next/server";
import { verifyAndApply } from "@/lib/paystackServer";

export async function POST(req: Request) {
  const { reference } = await req.json();
  if (!reference) {
    return NextResponse.json({ error: "Missing reference." }, { status: 400 });
  }

  const result = await verifyAndApply(reference);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, status: result.status });
}
