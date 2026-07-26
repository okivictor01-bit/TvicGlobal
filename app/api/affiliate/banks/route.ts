import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://api.paystack.co/bank?country=nigeria", {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();

  if (!data.status) {
    return NextResponse.json({ error: "Could not fetch bank list." }, { status: 502 });
  }

  const banks = (data.data as any[]).map((b) => ({ name: b.name, code: b.code }));
  return NextResponse.json({ banks });
}
