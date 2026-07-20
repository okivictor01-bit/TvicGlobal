"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PLANS, PlanKey } from "@/lib/paystack";

export default function BillingPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payingPlan, setPayingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
    if (!prof) { router.push("/login"); return; }
    setProfile(prof);

    const { data: biz } = await supabase.from("businesses").select("*").eq("id", prof.business_id).single();
    setBusiness(biz);
    setLoading(false);
  }

  async function handlePay(plan: PlanKey) {
    setError("");
    setPayingPlan(plan);
    const { data: { user } } = await supabase.auth.getUser();
    const res = await fetch("/api/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, businessId: profile.business_id, email: user?.email }),
    });
    const result = await res.json();
    if (!res.ok) {
      setError(result.error || "Could not start payment. Try again.");
      setPayingPlan(null);
      return;
    }
    window.location.href = result.authorization_url;
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  const isOwner = profile?.role === "owner";
  const now = new Date();
  const trialEndsAt = business?.trial_ends_at ? new Date(business.trial_ends_at) : null;
  const subExpiresAt = business?.subscription_expires_at ? new Date(business.subscription_expires_at) : null;
  const isPaidActive = business?.subscription_status === "active" && subExpiresAt && now < subExpiresAt;
  const isTrialActive = !isPaidActive && business?.subscription_status === "trial" && trialEndsAt && now < trialEndsAt;
  const daysLeft = (target: Date) => Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">TvicGlobal</p>
      <h1 className="text-2xl font-semibold mb-6">Billing</h1>

      <div className="border border-white/10 rounded-lg p-5 mb-8">
        {isPaidActive && (
          <>
            <p className="text-sm opacity-60 mb-1">Current plan</p>
            <p className="font-semibold mb-1">
              {PLANS[business.subscription_plan as PlanKey]?.label || business.subscription_plan}
            </p>
            <p className="text-xs opacity-60">Expires in {daysLeft(subExpiresAt!)} day(s)</p>
          </>
        )}
        {!isPaidActive && isTrialActive && (
          <>
            <p className="text-sm opacity-60 mb-1">Free trial</p>
            <p className="font-semibold mb-1">{daysLeft(trialEndsAt!)} day(s) left</p>
          </>
        )}
        {!isPaidActive && !isTrialActive && (
          <p className="text-rust font-semibold">
            Your trial has ended. Subscribe below to keep using TvicGlobal.
          </p>
        )}
      </div>

      {error && <p className="text-rust text-sm mb-4">{error}</p>}

      {!isOwner ? (
        <p className="text-sm opacity-70">
          Only the business owner can manage billing. Ask {business?.name ? `the owner of ${business.name}` : "your business owner"} to renew.
        </p>
      ) : (
        <div className="space-y-3">
          {(Object.keys(PLANS) as PlanKey[]).map((key) => {
            const p = PLANS[key];
            return (
              <div
                key={key}
                className="border border-white/10 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-sm">{p.label}</p>
                  <p className="font-mono text-gold text-sm">NGN {p.amount.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handlePay(key)}
                  disabled={payingPlan !== null}
                  className="bg-gold text-ink text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
                >
                  {payingPlan === key ? "Redirecting..." : "Pay"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
