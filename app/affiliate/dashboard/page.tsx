"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AffiliateDashboard() {
  const router = useRouter();
  const [affiliate, setAffiliate] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/affiliate/login");
        return;
      }

      const res = await fetch("/api/affiliate/dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Could not load your dashboard.");
        setLoading(false);
        return;
      }

      setAffiliate(result.affiliate);
      setReferrals(result.referrals);
      setCommissions(result.commissions);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/affiliate/login");
  }

  function copyLink() {
    const link = `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${affiliate.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;
  if (error) return <main className="min-h-screen flex items-center justify-center text-rust p-6">{error}</main>;

  const totalPaid = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + Number(c.amount), 0);
  const totalPending = commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.amount), 0);

  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${affiliate.referral_code}`;

  function commissionFor(businessId: string) {
    return commissions.find((c) => c.business_id === businessId);
  }

  return (
    <main className="min-h-screen p-6 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">Agrobuyer · Affiliate</p>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Hi, {affiliate.full_name.split(" ")[0]}</h1>
        <button onClick={handleLogout} className="text-sm underline opacity-70">Log out</button>
      </div>

      <div className="bg-surface border border-white/10 rounded-md p-4 mb-4">
        <p className="text-xs uppercase tracking-widest opacity-60 mb-2">Your referral link</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={referralLink}
            className="flex-1 bg-transparent border border-white/10 rounded-md p-2 text-sm"
          />
          <button
            onClick={copyLink}
            className="bg-gold text-ink font-semibold rounded-md px-3 py-2 text-sm whitespace-nowrap"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface border border-white/10 rounded-md p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Total earned</p>
          <p className="text-xl font-semibold text-gold">NGN {totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-white/10 rounded-md p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Pending</p>
          <p className="text-xl font-semibold">NGN {totalPending.toLocaleString()}</p>
        </div>
      </div>

      <h2 className="text-sm uppercase tracking-widest opacity-60 mb-3">Your referrals ({referrals.length})</h2>

      {referrals.length === 0 && (
        <p className="text-sm opacity-60">
          No referrals yet. Share your link above to start earning.
        </p>
      )}

      <ul className="space-y-3">
        {referrals.map((r) => {
          const commission = commissionFor(r.id);
          return (
            <li key={r.id} className="bg-surface border border-white/10 rounded-md p-4">
              <p className="font-semibold">{r.name}</p>
              <p className="text-sm opacity-70 capitalize">Status: {r.subscription_status}</p>
              {commission ? (
                <p className="text-sm mt-1">
                  Commission: NGN {Number(commission.amount).toLocaleString()} —{" "}
                  <span className={commission.status === "paid" ? "text-gold" : "opacity-70"}>
                    {commission.status}
                  </span>
                </p>
              ) : (
                <p className="text-sm opacity-50 mt-1">No subscription payment yet</p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
