import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PLANS, PlanKey } from "@/lib/paystack";

export async function POST(req: Request) {
  const { plan, businessId, email } = await req.json();

  if (!plan || !(plan in PLANS) || !businessId || !email) {
    return NextResponse.json({ error: "Missing or invalid fields." }, { status: 400 });
  }

  const selected = PLANS[plan as PlanKey];
  const reference = `agrobuyer_${businessId}_${Date.now()}`;

  const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: selected.amount * 100, // Paystack expects kobo
      reference,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing/callback`,
      metadata: { businessId, plan },
    }),
  });

  const data = await paystackRes.json();
  if (!data.status) {
    return NextResponse.json(
      { error: data.message || "Could not start payment with Paystack." },
      { status: 400 }
    );
  }

  const { error: txError } = await supabaseAdmin.from("payment_transactions").insert({
    business_id: businessId,
    plan,
    amount: selected.amount,
    paystack_reference: reference,
    status: "pending",
  });
  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 400 });
  }

  return NextResponse.json({ authorization_url: data.data.authorization_url });
}
