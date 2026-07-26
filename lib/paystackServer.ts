import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PLANS, PlanKey } from "@/lib/paystack";

type VerifyResult =
  | { ok: true; status: "success" | "failed" }
  | { ok: false; error: string };

// Confirms a transaction with Paystack and, if successful, extends the
// business's subscription. Called from both the redirect-callback verify
// route and the webhook route, so it's written to be safe to call twice
// for the same reference (idempotent on the "already succeeded" case).
export async function verifyAndApply(reference: string): Promise<VerifyResult> {
  const paystackRes = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  );
  const data = await paystackRes.json();

  if (!data.status || !data.data) {
    return { ok: false, error: "Could not verify transaction with Paystack." };
  }

  const { data: existing } = await supabaseAdmin
    .from("payment_transactions")
    .select("*")
    .eq("paystack_reference", reference)
    .single();

  if (!existing) {
    return { ok: false, error: "No matching transaction record found." };
  }

  // Already processed (e.g. both the callback page and the webhook fired) - don't double-extend.
  if (existing.status === "success") {
    return { ok: true, status: "success" };
  }

  if (data.data.status !== "success") {
    await supabaseAdmin
      .from("payment_transactions")
      .update({ status: "failed" })
      .eq("paystack_reference", reference);
    return { ok: true, status: "failed" };
  }

  const plan = existing.plan as PlanKey;
  const planInfo = PLANS[plan];
  if (!planInfo) {
    return { ok: false, error: "Unknown plan on transaction record." };
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("subscription_expires_at")
    .eq("id", existing.business_id)
    .single();

  const now = new Date();
  const currentExpiry = business?.subscription_expires_at
    ? new Date(business.subscription_expires_at)
    : null;
  // If they're renewing before their current paid period ends, extend from
  // that date rather than from today, so they don't lose paid days.
  const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(base.getTime() + planInfo.days * 24 * 60 * 60 * 1000);

  await supabaseAdmin
    .from("businesses")
    .update({
      subscription_status: "active",
      subscription_plan: plan,
      subscription_expires_at: newExpiry.toISOString(),
    })
    .eq("id", existing.business_id);

  await supabaseAdmin
    .from("payment_transactions")
    .update({ status: "success" })
    .eq("paystack_reference", reference);

  // Fire-and-forget-but-tracked: pay the referring affiliate their 30% cut,
  // guarded so this can only ever happen once per business (see comments below).
  try {
    await payAffiliateCommission(existing.business_id, planInfo.amount);
  } catch (err) {
    console.error("Affiliate commission payout failed:", err);
  }

  return { ok: true, status: "success" };
}

// Pays a referring affiliate 30% of a business's first successful
// subscription payment, via an automated Paystack transfer.
//
// Safe to call on every successful payment (including renewals): it's a
// no-op unless the business was actually referred by an affiliate, and the
// unique constraint on affiliate_commissions.business_id -- combined with
// the existing-row check below -- guarantees a commission is only ever
// created (and therefore only ever paid) once per business, on whichever
// payment happens to be their first successful one.
async function payAffiliateCommission(businessId: string, planAmount: number) {
  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("referred_by_affiliate_id")
    .eq("id", businessId)
    .single();

  if (!business?.referred_by_affiliate_id) return;

  const { data: existingCommission } = await supabaseAdmin
    .from("affiliate_commissions")
    .select("id")
    .eq("business_id", businessId)
    .maybeSingle();
  if (existingCommission) return;

  const { data: affiliate } = await supabaseAdmin
    .from("affiliates")
    .select("id, paystack_recipient_code")
    .eq("id", business.referred_by_affiliate_id)
    .single();
  if (!affiliate?.paystack_recipient_code) return;

  const commissionAmount = Math.round(planAmount * 0.3);

  // Insert as "pending" first. If two calls race for the same business,
  // the unique constraint on business_id makes the second insert fail,
  // so only one of them proceeds to actually initiate a transfer.
  const { data: commissionRow, error: insertError } = await supabaseAdmin
    .from("affiliate_commissions")
    .insert({
      affiliate_id: affiliate.id,
      business_id: businessId,
      amount: commissionAmount,
      status: "pending",
    })
    .select()
    .single();

  if (insertError || !commissionRow) return;

  const transferRes = await fetch("https://api.paystack.co/transfer", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: commissionAmount * 100, // Paystack transfer amounts are in kobo
      recipient: affiliate.paystack_recipient_code,
      reason: "Agrobuyer affiliate commission",
    }),
  });
  const transferData = await transferRes.json();

  if (transferData.status) {
    await supabaseAdmin
      .from("affiliate_commissions")
      .update({ status: "paid", paystack_transfer_reference: transferData.data?.reference || null })
      .eq("id", commissionRow.id);
  } else {
    await supabaseAdmin
      .from("affiliate_commissions")
      .update({ status: "failed", failure_reason: transferData.message || "Transfer failed" })
      .eq("id", commissionRow.id);
  }
}
