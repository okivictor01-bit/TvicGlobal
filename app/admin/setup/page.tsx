"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SuperAdminSetup() {
  const router = useRouter();
  const [form, setForm] = useState({ secret: "", fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/bootstrap-super-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await res.json();

    if (!res.ok) {
      setError(result.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">
          TvicGlobal · Platform Setup
        </p>
        <h1 className="text-2xl font-semibold mb-6">Create Super Admin</h1>

        {success ? (
          <div className="border border-olive rounded-lg p-4">
            <p className="text-olive font-semibold mb-2">Super Admin created ✓</p>
            <p className="text-sm">You can now log in at /login with this account.</p>
          </div>
        ) : (
          <>
            <input
              type="password"
              placeholder="Setup secret"
              className="w-full bg-surface border border-white/10 rounded-md p-3"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              required
            />
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
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-surface border border-white/10 rounded-md p-3"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
            />
            {error && <p className="text-rust text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-ink font-semibold rounded-md p-3 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Super Admin"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
