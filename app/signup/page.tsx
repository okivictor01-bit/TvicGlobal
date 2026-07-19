"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({
    businessName: "", ownerName: "", email: "", password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/signup", {
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

    // Log them in immediately after successful signup
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">
          TvicGlobal · Register Your Business
        </p>
        <h1 className="text-2xl font-semibold mb-6">Create your account</h1>

        <input
          placeholder="Business name"
          className="w-full bg-surface border border-white/10 rounded-md p-3"
          value={form.businessName}
          onChange={(e) => setForm({ ...form, businessName: e.target.value })}
          required
        />
        <input
          placeholder="Your full name"
          className="w-full bg-surface border border-white/10 rounded-md p-3"
          value={form.ownerName}
          onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
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
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </main>
  );
}
