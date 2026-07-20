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

  return { ok: true, status: "success" };
}
