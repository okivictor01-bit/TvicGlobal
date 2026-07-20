"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function InventoryPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (profile) computeInventory();
  }, [branchFilter, profile]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
    if (!prof || !["owner", "manager"].includes(prof.role)) { router.push("/dashboard"); return; }
    setProfile(prof);

    const { data: branchList } = await supabase.from("branches").select("*").order("name");
    setBranches(branchList || []);

    const { data: productList } = await supabase.from("products").select("*").order("name");
    setProducts(productList || []);

    if (prof.role === "manager") setBranchFilter(prof.branch_id);

    setLoading(false);
  }

  async function computeInventory() {
    let purchaseQuery = supabase.from("purchases").select("branch_id, product_id, weight_kg, net_value");
    let saleQuery = supabase.from("sales").select("branch_id, product_id, weight_kg, total_value");

    if (branchFilter !== "all") {
      purchaseQuery = purchaseQuery.eq("branch_id", branchFilter);
      saleQuery = saleQuery.eq("branch_id", branchFilter);
    }

    const { data: purchases } = await purchaseQuery;
    const { data: sales } = await saleQuery;

    const byProduct: Record<string, any> = {};
    (purchases || []).forEach((p: any) => {
      if (!byProduct[p.product_id]) {
        byProduct[p.product_id] = { purchasedWeight: 0, purchasedValue: 0, soldWeight: 0, soldValue: 0 };
      }
      byProduct[p.product_id].purchasedWeight += Number(p.weight_kg);
      byProduct[p.product_id].purchasedValue += Number(p.net_value);
    });
    (sales || []).forEach((s: any) => {
      if (!byProduct[s.product_id]) {
        byProduct[s.product_id] = { purchasedWeight: 0, purchasedValue: 0, soldWeight: 0, soldValue: 0 };
      }
      byProduct[s.product_id].soldWeight += Number(s.weight_kg);
      byProduct[s.product_id].soldValue += Number(s.total_value);
    });

    const result = Object.entries(byProduct).map(([productId, v]: [string, any]) => {
      const avgCost = v.purchasedWeight > 0 ? v.purchasedValue / v.purchasedWeight : 0;
      const avgSalePrice = v.soldWeight > 0 ? v.soldValue / v.soldWeight : 0;
      const available = v.purchasedWeight - v.soldWeight;
      const marginPerKg = avgSalePrice - avgCost;
      const totalMargin = v.soldValue - v.soldWeight * avgCost;
      const product = products.find((p) => p.id === productId);
      return {
        productId,
        productName: product?.name || "Unknown",
        purchasedWeight: v.purchasedWeight,
        soldWeight: v.soldWeight,
        available,
        avgCost,
        avgSalePrice,
        marginPerKg,
        totalMargin,
      };
    });

    setRows(result);
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">TvicGlobal</p>
      <h1 className="text-2xl font-semibold mb-6">Inventory</h1>

      {profile?.role === "owner" && (
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
      )}

      <div className="space-y-4">
        {rows.length === 0 && (
          <p className="text-sm opacity-60">No purchases recorded yet for this selection.</p>
        )}
        {rows.map((r) => (
          <div key={r.productId} className="border border-white/10 rounded-lg p-5">
            <p className="text-lg font-semibold mb-3">{r.productName}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="opacity-60 text-xs mb-1">Available Stock</p>
                <p className="font-mono text-gold text-base">{r.available.toLocaleString()} kg</p>
              </div>
              <div>
                <p className="opacity-60 text-xs mb-1">Avg. Purchase Cost</p>
                <p className="font-mono">NGN {r.avgCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}/kg</p>
              </div>
              <div>
                <p className="opacity-60 text-xs mb-1">Total Purchased</p>
                <p className="font-mono">{r.purchasedWeight.toLocaleString()} kg</p>
              </div>
              <div>
                <p className="opacity-60 text-xs mb-1">Total Sold</p>
                <p className="font-mono">{r.soldWeight.toLocaleString()} kg</p>
              </div>
              {r.soldWeight > 0 && (
                <>
                  <div>
                    <p className="opacity-60 text-xs mb-1">Avg. Sale Price</p>
                    <p className="font-mono">NGN {r.avgSalePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}/kg</p>
                  </div>
                  <div>
                    <p className="opacity-60 text-xs mb-1">Total Margin</p>
                    <p className={`font-mono ${r.totalMargin >= 0 ? "text-olive" : "text-rust"}`}>
                      NGN {r.totalMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <a href="/sales" className="block mt-6 text-gold underline text-sm">
        + Record a Sale to Exporter
      </a>
    </main>
  );
}
