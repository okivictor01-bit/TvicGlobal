"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PeriodKey = "today" | "week" | "month" | "year";

function getPeriodRange(period: PeriodKey) {
  const now = new Date();
  let start: Date;
  let label: string;

  if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    label = "Today - " + now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } else if (period === "week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    label = "This Week - starting " + start.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } else if (period === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    label = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  } else {
    start = new Date(now.getFullYear(), 0, 1);
    label = String(now.getFullYear());
  }

  return { start, end: now, label };
}

export default function ReportsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [period, setPeriod] = useState<PeriodKey>("today");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (profile) fetchPurchases();
  }, [period, branchFilter, profile]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase
      .from("app_users")
      .select("*, businesses(name)")
      .eq("id", user.id)
      .single();
    if (!prof || prof.role !== "owner") { router.push("/dashboard"); return; }
    setProfile(prof);
    setBusinessName(prof.businesses?.name || "Business");

    const { data: branchList } = await supabase.from("branches").select("*").order("name");
    setBranches(branchList || []);

    const { data: advancesData } = await supabase.from("advances").select("amount");
    const { data: purchasesData } = await supabase.from("purchases").select("advance_deducted");
    const totalAdv = (advancesData || []).reduce((s: number, a: any) => s + Number(a.amount), 0);
    const totalDeducted = (purchasesData || []).reduce((s: number, p: any) => s + Number(p.advance_deducted || 0), 0);
    setTotalOutstanding(totalAdv - totalDeducted);

    setLoading(false);
  }

  async function fetchPurchases() {
    const { start } = getPeriodRange(period);
    let query = supabase
      .from("purchases")
      .select("*, farmers(name), products(name), branches(name)")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false });

    if (branchFilter !== "all") {
      query = query.eq("branch_id", branchFilter);
    }

    const { data } = await query;
    setPurchases(data || []);
  }

  function handleExportPdf() {
    window.print();
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  const { label } = getPeriodRange(period);

  const totals = purchases.reduce(
    (acc, p) => {
      acc.gross += Number(p.gross_value || 0);
      acc.weight += Number(p.weight_kg || 0);
      acc.discount += Number(p.quality_discount_value || 0);
      acc.advanceDeducted += Number(p.advance_deducted || 0);
      acc.finalPaid += Number(p.final_amount_paid || 0);
      return acc;
    },
    { gross: 0, weight: 0, discount: 0, advanceDeducted: 0, finalPaid: 0 }
  );

  const avgDiscountPct = purchases.length > 0
    ? purchases.reduce((s, p) => s + Number(p.quality_discount_pct || 0), 0) / purchases.length
    : 0;

  const periodOptions: { key: PeriodKey; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "Week" },
    { key: "month", label: "Month" },
    { key: "year", label: "Year" },
  ];

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { border: 1px solid #ccc !important; background: white !important; color: black !important; }
        }
      `}</style>
      <main className="min-h-screen p-8 max-w-2xl mx-auto">
        <div className="no-print">
          <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">TvicGlobal</p>
          <h1 className="text-2xl font-semibold mb-6">Reports</h1>

          <div className="flex gap-2 mb-4 flex-wrap">
            {periodOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`text-xs px-4 py-2 rounded-md border ${
                  period === opt.key
                    ? "bg-gold text-ink border-gold font-semibold"
                    : "border-white/10 text-ivory"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <select
              className="bg-surface border border-white/10 rounded-md p-2 text-sm"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">All Branches (Consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="print-card border border-white/10 rounded-lg p-6 mb-6">
          <p className="text-xs opacity-60 mb-1">
            {businessName} - {branchFilter === "all" ? "All Branches" : branches.find((b) => b.id === branchFilter)?.name}
          </p>
          <h2 className="text-xl font-semibold mb-4">{label}</h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="opacity-60 text-xs mb-1">Total Purchases</p>
              <p className="font-mono text-lg">NGN {totals.gross.toLocaleString()}</p>
            </div>
            <div>
              <p className="opacity-60 text-xs mb-1">Weight Bought</p>
              <p className="font-mono text-lg">{totals.weight.toLocaleString()} kg</p>
            </div>
            <div>
              <p className="opacity-60 text-xs mb-1">Avg. Quality Discount</p>
              <p className="font-mono text-lg">{avgDiscountPct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="opacity-60 text-xs mb-1">Total Paid to Farmers</p>
              <p className="font-mono text-lg">NGN {totals.finalPaid.toLocaleString()}</p>
            </div>
            <div>
              <p className="opacity-60 text-xs mb-1">Advances Deducted (period)</p>
              <p className="font-mono text-lg">NGN {totals.advanceDeducted.toLocaleString()}</p>
            </div>
            <div>
              <p className="opacity-60 text-xs mb-1">Outstanding Advances (all-time)</p>
              <p className="font-mono text-lg">NGN {totalOutstanding.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="print-card border border-white/10 rounded-lg p-6">
          <p className="text-sm font-semibold mb-3">Purchases ({purchases.length})</p>
          {purchases.length === 0 ? (
            <p className="text-sm opacity-60">No purchases recorded in this period.</p>
          ) : (
            <div className="space-y-2">
              {purchases.map((p) => (
                <div key={p.id} className="flex justify-between text-xs border-b border-white/10 pb-2">
                  <div>
                    <p>{p.farmers?.name} - {p.products?.name}</p>
                    <p className="opacity-60">
                      {p.branches?.name} - {new Date(p.created_at).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                  <p className="font-mono">NGN {Number(p.final_amount_paid).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleExportPdf}
          className="no-print w-full bg-gold text-ink font-semibold rounded-md p-3 mt-6"
        >
          Export as PDF
        </button>
      </main>
    </>
  );
}
