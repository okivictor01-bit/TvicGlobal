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
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingProductId, setAdjustingProductId] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState({ mode: "add", amount: "", reason: "", branchId: "" });
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
  if (profile) computeInventory();
}, [branchFilter, profile, products]);

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
    if (branchList && branchList.length > 0) {
      setAdjustForm((f) => ({ ...f, branchId: prof.role === "manager" ? prof.branch_id : branchList[0].id }));
    }

    setLoading(false);
  }

  async function computeInventory() {
    let purchaseQuery = supabase.from("purchases").select("branch_id, product_id, weight_kg, net_value");
    let saleQuery = supabase.from("sales").select("branch_id, product_id, weight_kg, total_value");
    let adjustmentQuery = supabase.from("inventory_adjustments").select("branch_id, product_id, weight_kg_delta, reason, created_at");

    if (branchFilter !== "all") {
      purchaseQuery = purchaseQuery.eq("branch_id", branchFilter);
      saleQuery = saleQuery.eq("branch_id", branchFilter);
      adjustmentQuery = adjustmentQuery.eq("branch_id", branchFilter);
    }

    const { data: purchases } = await purchaseQuery;
    const { data: sales } = await saleQuery;
    const { data: adjustmentRows } = await adjustmentQuery;
    setAdjustments(adjustmentRows || []);

    const byProduct: Record<string, any> = {};
    (purchases || []).forEach((p: any) => {
      if (!byProduct[p.product_id]) {
        byProduct[p.product_id] = { purchasedWeight: 0, purchasedValue: 0, soldWeight: 0, soldValue: 0, adjustmentWeight: 0 };
      }
      byProduct[p.product_id].purchasedWeight += Number(p.weight_kg);
      byProduct[p.product_id].purchasedValue += Number(p.net_value);
    });
    (sales || []).forEach((s: any) => {
      if (!byProduct[s.product_id]) {
        byProduct[s.product_id] = { purchasedWeight: 0, purchasedValue: 0, soldWeight: 0, soldValue: 0, adjustmentWeight: 0 };
      }
      byProduct[s.product_id].soldWeight += Number(s.weight_kg);
      byProduct[s.product_id].soldValue += Number(s.total_value);
    });
    (adjustmentRows || []).forEach((a: any) => {
      if (!byProduct[a.product_id]) {
        byProduct[a.product_id] = { purchasedWeight: 0, purchasedValue: 0, soldWeight: 0, soldValue: 0, adjustmentWeight: 0 };
      }
      byProduct[a.product_id].adjustmentWeight += Number(a.weight_kg_delta);
    });

    const result = Object.entries(byProduct).map(([productId, v]: [string, any]) => {
      const avgCost = v.purchasedWeight > 0 ? v.purchasedValue / v.purchasedWeight : 0;
      const avgSalePrice = v.soldWeight > 0 ? v.soldValue / v.soldWeight : 0;
      const available = v.purchasedWeight - v.soldWeight + v.adjustmentWeight;
      const marginPerKg = avgSalePrice - avgCost;
      const totalMargin = v.soldValue - v.soldWeight * avgCost;
      const product = products.find((p) => p.id === productId);
      return {
        productId,
        productName: product?.name || "Unknown",
        purchasedWeight: v.purchasedWeight,
        soldWeight: v.soldWeight,
        adjustmentWeight: v.adjustmentWeight,
        available,
        avgCost,
        avgSalePrice,
        marginPerKg,
        totalMargin,
      };
    });

    setRows(result);
  }

  async function handleSaveAdjustment(e: React.FormEvent, productId: string, currentAvailable: number) {
    e.preventDefault();
    setError("");

    const amount = Number(adjustForm.amount);
    if (!amount && amount !== 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!adjustForm.reason.trim()) {
      setError("Please give a reason for this adjustment.");
      return;
    }

    // "Set to" mode computes the delta needed to reach the target figure.
    // "Subtract" mode negates the entered (positive) amount.
    const delta =
      adjustForm.mode === "set" ? amount - currentAvailable :
      adjustForm.mode === "subtract" ? -Math.abs(amount) :
      amount;

    setSavingAdjustment(true);
    const { error: insertError } = await supabase.from("inventory_adjustments").insert({
      business_id: profile.business_id,
      branch_id: adjustForm.branchId,
      product_id: productId,
      weight_kg_delta: delta,
      reason: adjustForm.reason,
      recorded_by: profile.id,
    });
    setSavingAdjustment(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setAdjustForm({ mode: "add", amount: "", reason: "", branchId: adjustForm.branchId });
    setAdjustingProductId(null);
    await computeInventory();
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">Agrobuyer</p>
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

      {error && <p className="text-rust text-sm mb-4">{error}</p>}

      <div className="space-y-4">
        {rows.length === 0 && (
          <p className="text-sm opacity-60">No purchases recorded yet for this selection.</p>
        )}
        {rows.map((r) => (
          <div key={r.productId} className="border border-white/10 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-semibold">{r.productName}</p>
              {profile?.role === "owner" && (
                <button
                  onClick={() => {
                    setAdjustingProductId(adjustingProductId === r.productId ? null : r.productId);
                    setAdjustForm((f) => ({ ...f, mode: "add", amount: "", reason: "" }));
                    setError("");
                  }}
                  className="text-xs text-gold underline"
                >
                  {adjustingProductId === r.productId ? "Cancel" : "Adjust Stock"}
                </button>
              )}
            </div>
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
              {r.adjustmentWeight !== 0 && (
                <div>
                  <p className="opacity-60 text-xs mb-1">Adjustments</p>
                  <p className={`font-mono ${r.adjustmentWeight >= 0 ? "text-olive" : "text-rust"}`}>
                    {r.adjustmentWeight > 0 ? "+" : ""}{r.adjustmentWeight.toLocaleString()} kg
                  </p>
                </div>
              )}
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

            {adjustingProductId === r.productId && (
              <form
                onSubmit={(e) => handleSaveAdjustment(e, r.productId, r.available)}
                className="mt-4 pt-4 border-t border-white/10 space-y-3"
              >
                {branches.length > 1 && (
                  <select
                    className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
                    value={adjustForm.branchId}
                    onChange={(e) => setAdjustForm({ ...adjustForm, branchId: e.target.value })}
                    required
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                )}
                <select
                  className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
                  value={adjustForm.mode}
                  onChange={(e) => setAdjustForm({ ...adjustForm, mode: e.target.value })}
                >
                  <option value="add">Add stock (kg)</option>
                  <option value="subtract">Remove stock (kg)</option>
                  <option value="set">Set available stock to (kg)</option>
                </select>
                <input
                  type="number"
                  step="0.01"
                  placeholder={adjustForm.mode === "set" ? "New available stock (kg)" : "Amount (kg)"}
                  className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
                  value={adjustForm.amount}
                  onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                  required
                />
                <input
                  placeholder="Reason (e.g. spoilage, stock count correction)"
                  className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  required
                />
                <button
                  type="submit"
                  disabled={savingAdjustment}
                  className="bg-gold text-ink font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-50"
                >
                  {savingAdjustment ? "Saving..." : "Save Adjustment"}
                </button>
              </form>
            )}
          </div>
        ))}
      </div>

      <a href="/sales" className="block mt-6 text-gold underline text-sm">
        + Record a Sale to Exporter
      </a>

      <a href="/dashboard" className="block mt-3 text-sm underline opacity-70">Back to Dashboard</a>
    </main>
  );
}
