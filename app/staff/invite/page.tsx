"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function InviteStaff() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", role: "secretary", branchId: "" });
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
      if (!prof || !["owner", "manager"].includes(prof.role)) {
        router.push("/dashboard");
        return;
      }
      setProfile(prof);

      const { data: branchList } = await supabase.from("branches").select("*");
      setBranches(branchList || []);
      setForm((f) => ({
        ...f,
        branchId: prof.role === "manager" ? prof.branch_id : (branchList?.[0]?.id || ""),
      }));
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/invite-staff", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      setLoading(false);
      return;
    }
    setResult(data);
    setLoading(false);
  }

  if (!profile) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  const roleOptions = profile.role === "owner"
    ? ["manager", "secretary"]
    : ["secretary"];

  return (
    <main className="min-h-screen p-8 max-w-sm mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">Agrobuyer</p>
      <h1 className="text-2xl font-semibold mb-6">Invite Staff</h1>

      {result ? (
        <div className="border border-olive rounded-lg p-4 space-y-2">
          <p className="text-olive font-semibold">Account created ✓</p>
          <p className="text-sm">Share these login details with {form.fullName}:</p>
          <p className="font-mono text-sm">Email: {result.email}</p>
          <p className="font-mono text-sm">Temp password: {result.tempPassword}</p>
          <p className="text-xs opacity-60 mt-2">They should log in at /login and can change their password later.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            placeholder="Full name"
            className="w-full bg-surface border border-white/10 rounded-md p-3"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full bg-surface border border-white/10 rounded-md p-3"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <select
            className="w-full bg-surface border border-white/10 rounded-md p-3"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {profile.role === "owner" && (
            <select
              className="w-full bg-surface border border-white/10 rounded-md p-3"
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          {error && <p className="text-rust text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-ink font-semibold rounded-md p-3 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Staff Account"}
          </button>
        </form>
      )}
    </main>
  );
}
