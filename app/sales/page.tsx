"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SalesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [availableStock, setAvailableStock] = useState<number>(0);

  const [branchId, setBranchId] = useState("");
  const [productId, setProductId] = useState("");
  const [exporterName, setExporterName] = useState("");
  const [weight, setWeight] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);

  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pastSales, setPastSales] = useState<any[]>([]);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editSaleForm, setEditSaleForm] = useState({ productId: "", exporterName: "", weight: "", price: "" });
  const [savingSaleEdit, setSavingSaleEdit] = useState(false);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (branchId && productId) computeAvailableStock();
  }, [branchId, productId]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
    if (!prof || !["owner", "manager"].includes(prof.role)) { router.push("/dashboard"); return; }
    setProfile(prof);
    setBranchId(prof.branch_id);

    const { data: branchList } = await supabase.from("branches").select("*").order("name");
    setBranches(branchList || []);

    const { data: productList } = await supabase.from("products").select("*").order("name");
    setProducts(productList || []);
    if (productList && productList.length > 0) setProductId(productList[0].id);

    await loadPastSales(prof.business_id);
    setLoading(false);
  }

  async function loadPastSales(businessId: string) {
    const { data } = await supabase
      .from("sales")
      .select("*, products(name), branches(name)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(50);
    setPastSales(data || []);
  }

  async function computeAvailableStock() {
    const { data: purchases } = await supabase
      .from("purchases")
      .select("weight_kg")
      .eq("branch_id", branchId)
      .eq("product_id", productId);
    const { data: sales } = await supabase
      .from("sales")
      .select("weight_kg")
      .eq("branch_id", branchId)
      .eq("product_id", productId);

    const purchased = (purchases || []).reduce((s: number, p: any) => s + Number(p.weight_kg), 0);
    const sold = (sales || []).reduce((s: number, sale: any) => s + Number(sale.weight_kg), 0);
    setAvailableStock(purchased - sold);
  }

  const totalValue = weight * price;
  const exceedsStock = weight > availableStock;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (exceedsStock) {
      setError("Weight exceeds available stock.");
      return;
    }
    setSaving(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("sales")
      .insert({
        business_id: profile.business_id,
        branch_id: branchId,
        exporter_name: exporterName,
        product_id: productId,
        weight_kg: weight,
        price_per_kg: price,
        total_value: totalValue,
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setReceipt({
      ...data,
      productName: products.find((p) => p.id === productId)?.name,
      branchName: branches.find((b) => b.id === branchId)?.name,
    });
    setSaving(false);
    setExporterName("");
    setWeight(0);
    computeAvailableStock();
    loadPastSales(profile.business_id);
  }

  function startEditSale(s: any) {
    setEditingSaleId(s.id);
    setEditSaleForm({
      productId: s.product_id,
      exporterName: s.exporter_name,
      weight: String(s.weight_kg),
      price: String(s.price_per_kg),
    });
    setError("");
  }

  async function handleSaveSaleEdit(saleId: string) {
    setError("");
    const w = Number(editSaleForm.weight);
    const p = Number(editSaleForm.price);
    if (!w || w <= 0 || !p || p <= 0 || !editSaleForm.exporterName.trim()) {
      setError("Enter valid weight, price, and exporter name.");
      return;
    }
    setSavingSaleEdit(true);
    const { error: updateError } = await supabase
      .from("sales")
      .update({
        product_id: editSaleForm.productId,
        exporter_name: editSaleForm.exporterName,
        weight_kg: w,
        price_per_kg: p,
        total_value: w * p,
      })
      .eq("id", saleId);
    setSavingSaleEdit(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditingSaleId(null);
    loadPastSales(profile.business_id);
    computeAvailableStock();
  }

  async function handleDeleteSale(saleId: string) {
    if (!confirm("Delete this sale permanently? This can't be undone.")) return;
    setError("");
    const { error: deleteError } = await supabase.from("sales").delete().eq("id", saleId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    loadPastSales(profile.business_id);
    computeAvailableStock();
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">Agrobuyer</p>
      <h1 className="text-2xl font-semibold mb-6">Record a Sale to Exporter</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {profile?.role === "owner" && branches.length > 1 && (
          <div>
            <label className="text-xs opacity-60 block mb-1">Branch</label>
            <select
              className="w-full bg-surface border border-white/10 rounded-md p-3"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs opacity-60 block mb-1">Product</label>
          <select
            className="w-full bg-surface border border-white/10 rounded-md p-3"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="text-xs opacity-60 mt-1">
            Available stock: <span className={exceedsStock ? "text-rust" : "text-gold"}>{availableStock.toLocaleString()} kg</span>
          </p>
        </div>

        <div>
          <label className="text-xs opacity-60 block mb-1">Exporter Name</label>
          <input
            className="w-full bg-surface border border-white/10 rounded-md p-3"
            value={exporterName}
            onChange={(e) => setExporterName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs opacity-60 block mb-1">Weight (kg)</label>
            <input
              type="number"
              className="w-full bg-surface border border-white/10 rounded-md p-3"
              value={weight}
              onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className="text-xs opacity-60 block mb-1">Price per kg (NGN)</label>
            <input
              type="number"
              className="w-full bg-surface border border-white/10 rounded-md p-3"
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="border border-white/10 rounded-lg p-4">
          <div className="flex justify-between text-base font-semibold">
            <span>Total Sale Value</span>
            <span className="text-gold font-mono">NGN {totalValue.toLocaleString()}</span>
          </div>
        </div>

        {exceedsStock && (
          <p className="text-rust text-sm">This exceeds available stock ({availableStock.toLocaleString()} kg).</p>
        )}
        {error && <p className="text-rust text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving || exceedsStock}
          className="w-full bg-gold text-ink font-semibold rounded-md p-3 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Record Sale"}
        </button>
      </form>

      {receipt && (
        <div className="mt-6 border border-olive rounded-lg p-5 text-sm">
          <p className="text-olive font-semibold mb-2">Sale recorded ✓</p>
          <p>{receipt.branchName} sold {receipt.weight_kg} kg of {receipt.productName} to {receipt.exporter_name}</p>
          <p className="font-mono mt-2">Total: NGN {Number(receipt.total_value).toLocaleString()}</p>
        </div>
      )}

      <a href="/inventory" className="block mt-6 text-gold underline text-sm">
        View Inventory
      </a>

      <h2 className="text-sm uppercase tracking-widest opacity-60 mt-8 mb-3">Recent Sales</h2>
      <ul className="space-y-3 mb-6">
        {pastSales.map((s) => (
          <li key={s.id} className="border border-white/10 rounded-lg p-4">
            {editingSaleId === s.id ? (
              <div className="space-y-2">
                <select
                  className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm"
                  value={editSaleForm.productId}
                  onChange={(e) => setEditSaleForm({ ...editSaleForm, productId: e.target.value })}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input
                  placeholder="Exporter name"
                  className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm"
                  value={editSaleForm.exporterName}
                  onChange={(e) => setEditSaleForm({ ...editSaleForm, exporterName: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    className="bg-surface border border-white/10 rounded-md p-2 text-sm"
                    value={editSaleForm.weight}
                    onChange={(e) => setEditSaleForm({ ...editSaleForm, weight: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Price/kg"
                    className="bg-surface border border-white/10 rounded-md p-2 text-sm"
                    value={editSaleForm.price}
                    onChange={(e) => setEditSaleForm({ ...editSaleForm, price: e.target.value })}
                  />
                </div>
                {error && <p className="text-rust text-xs">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveSaleEdit(s.id)}
                    disabled={savingSaleEdit}
                    className="text-xs bg-gold text-ink font-semibold rounded-md px-3 py-2 disabled:opacity-50"
                  >
                    {savingSaleEdit ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingSaleId(null)}
                    className="text-xs border border-white/10 rounded-md px-3 py-2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <p className="font-semibold text-sm">{s.products?.name} — {s.exporter_name}</p>
                  {(profile?.role === "owner" || (profile?.role === "manager" && s.branch_id === profile.branch_id)) && (
                    <div className="flex gap-2 ml-2 whitespace-nowrap">
                      <button
                        onClick={() => startEditSale(s)}
                        className="text-xs underline opacity-70"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSale(s.id)}
                        className="text-xs underline text-rust"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs opacity-60 mt-1">
                  {s.branches?.name} · {Number(s.weight_kg).toLocaleString()} kg @ NGN {Number(s.price_per_kg).toLocaleString()}/kg
                </p>
                <p className="font-mono text-sm text-gold mt-1">
                  NGN {Number(s.total_value).toLocaleString()}
                </p>
                <p className="text-xs opacity-40 mt-1">{new Date(s.created_at).toLocaleDateString()}</p>
              </>
            )}
          </li>
        ))}
        {pastSales.length === 0 && <p className="text-sm opacity-60">No sales recorded yet.</p>}
      </ul>

      <a href="/dashboard" className="block mt-3 text-sm underline opacity-70">Back to Dashboard</a>
    </main>
  );
}
