"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function FarmerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const farmerId = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [farmer, setFarmer] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
    if (!prof || prof.role === "super_admin") { router.push("/dashboard"); return; }
    setProfile(prof);

    const { data: farmerData, error: farmerError } = await supabase
      .from("farmers")
      .select("*")
      .eq("id", farmerId)
      .single();
    if (farmerError || !farmerData) {
      setError("Farmer not found.");
      setLoading(false);
      return;
    }
    setFarmer(farmerData);

    const { data: purchases } = await supabase
      .from("purchases")
      .select("*, products(name)")
      .eq("farmer_id", farmerId)
      .order("created_at", { ascending: false });

    const { data: advances } = await supabase
      .from("advances")
      .select("*")
      .eq("farmer_id", farmerId)
      .order("created_at", { ascending: false });

    const purchaseRows = (purchases || []).map((p: any) => ({
      type: "purchase" as const,
      id: p.id,
      created_at: p.created_at,
      productName: p.products?.name || "Unknown",
      weight_kg: p.weight_kg,
      price_per_kg: p.price_per_kg,
      quality_result: p.quality_result,
      net_value: p.net_value,
      advance_deducted: p.advance_deducted,
      final_amount_paid: p.final_amount_paid,
    }));

    const advanceRows = (advances || []).map((a: any) => ({
      type: "advance" as const,
      id: a.id,
      created_at: a.created_at,
      amount: a.amount,
    }));

    const combined = [...purchaseRows, ...advanceRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setTransactions(combined);

    const totalAdvances = (advances || []).reduce((sum: number, a: any) => sum + Number(a.amount), 0);
    const totalDeducted = (purchases || []).reduce(
      (sum: number, p: any) => sum + Number(p.advance_deducted || 0),
      0
    );
    setBalance(totalAdvances - totalDeducted);

    setLoading(false);
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  if (error) {
    return (
      <main className="min-h-screen p-8 max-w-lg mx-auto text-center">
        <p className="text-rust text-sm mb-4">{error}</p>
        <a href="/farmers" className="text-gold underline text-sm">Back to Farmers</a>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { border: 1px solid #ccc !important; background: white !important; color: black !important; }
        }
      `}</style>
      <main className="min-h-screen p-8 max-w-lg mx-auto">
        <a href="/farmers" className="no-print text-xs text-gold underline mb-4 inline-block">Back to Farmers</a>

        <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">TvicGlobal</p>
      <h1 className="text-2xl font-semibold mb-1">{farmer.name}</h1>
      <p className="text-xs opacity-60 mb-4">
        {farmer.phone} {farmer.location ? `- ${farmer.location}` : ""}
      </p>

      <div className="border border-white/10 rounded-lg p-4 mb-8">
        <p className="text-xs opacity-60 mb-1">Outstanding Advance Balance</p>
        <p className="text-xl font-mono text-gold">NGN {balance.toLocaleString()}</p>
      </div>

      <p className="text-sm font-semibold mb-3">Transaction History</p>
      <ul className="space-y-3">
        {transactions.map((t) => (
          <li key={`${t.type}-${t.id}`} className="border border-white/10 rounded-lg p-4">
            {t.type === "advance" ? (
              <>
                <p className="text-xs text-olive uppercase tracking-wide mb-1">Advance Given</p>
                <p className="font-mono text-sm mb-1">NGN {Number(t.amount).toLocaleString()}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gold uppercase tracking-wide mb-1">Purchase</p>
                <p className="text-sm mb-1">
                  {t.productName} - {Number(t.weight_kg).toLocaleString()} kg @ NGN{" "}
                  {Number(t.price_per_kg).toLocaleString()}/kg
                </p>
                <p className="text-xs opacity-60 mb-1">Quality: {t.quality_result}</p>
                <p className="text-xs opacity-60 mb-1">
                  Net value: NGN {Number(t.net_value).toLocaleString()}
                </p>
                {Number(t.advance_deducted) > 0 && (
                  <p className="text-xs opacity-60 mb-1">
                    Advance deducted: NGN {Number(t.advance_deducted).toLocaleString()}
                  </p>
                )}
                <p className="font-mono text-sm text-gold">
                  Paid: NGN {Number(t.final_amount_paid).toLocaleString()}
                </p>
              </>
            )}
            <p className="text-xs opacity-40 mt-2">
              {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString()}
            </p>
          </li>
        ))}
        {transactions.length === 0 && (
          <p className="text-sm opacity-60">No transactions with this farmer yet.</p>
        )}
      </ul>

      <button onClick={() => window.print()} className="no-print w-full bg-gold text-ink font-semibold rounded-md p-3 mt-6">Download as PDF</button>
      </main>
    </>
  );
}
