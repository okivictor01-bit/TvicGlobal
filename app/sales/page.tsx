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

    setLoading(false);
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
    </main>
  );
}
