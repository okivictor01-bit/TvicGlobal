import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { accountNumber, bankCode } = await req.json();

  if (!accountNumber || !bankCode) {
    return NextResponse.json({ error: "Account number and bank are required." }, { status: 400 });
  }

  const res = await fetch(
    `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  const data = await res.json();

  if (!data.status) {
    return NextResponse.json({ error: data.message || "Could not verify account." }, { status: 400 });
  }

  return NextResponse.json({ accountName: data.data.account_name });
}
