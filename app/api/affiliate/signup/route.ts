import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function generateReferralCode(name: string) {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 6) || "AGRO";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${suffix}`;
}

export async function POST(req: Request) {
  const { fullName, email, phone, password, bankCode, accountNumber, accountName } = await req.json();

  if (!fullName || !email || !password || !bankCode || !accountNumber || !accountName) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  // 1. Create the auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message || "Could not create account." }, { status: 400 });
  }

  // 2. Create a Paystack transfer recipient so payouts can be automated later
  const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "nuban",
      name: accountName,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });
  const recipientData = await recipientRes.json();

  if (!recipientData.status) {
    // Roll back the auth user so a failed signup doesn't leave an orphaned account
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json(
      { error: recipientData.message || "Could not verify payout account with Paystack." },
      { status: 400 }
    );
  }

  // 3. Create the affiliate record, retrying the referral code on the rare collision
  let affiliate = null;
  let lastError: any = null;
  for (let attempt = 0; attempt < 5 && !affiliate; attempt++) {
    const referralCode = generateReferralCode(fullName);
    const { data, error } = await supabaseAdmin
      .from("affiliates")
      .insert({
        user_id: authUser.user.id,
        full_name: fullName,
        email,
        phone: phone || null,
        referral_code: referralCode,
        bank_code: bankCode,
        account_number: accountNumber,
        account_name: accountName,
        paystack_recipient_code: recipientData.data.recipient_code,
      })
      .select()
      .single();
    if (data) affiliate = data;
    lastError = error;
  }

  if (!affiliate) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    return NextResponse.json({ error: lastError?.message || "Could not create affiliate record." }, { status: 400 });
  }

  return NextResponse.json({ success: true, referralCode: affiliate.referral_code });
}
