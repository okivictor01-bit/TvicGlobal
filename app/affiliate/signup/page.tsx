"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AffiliateSignup() {
  const router = useRouter();
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", password: "",
    bankCode: "", accountNumber: "",
  });
  const [accountName, setAccountName] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/affiliate/banks")
      .then((r) => r.json())
      .then((d) => setBanks(d.banks || []))
      .catch(() => setError("Could not load bank list. Refresh to try again."));
  }, []);

  async function handleResolveAccount() {
    setAccountName("");
    setResolveError("");
    if (!form.bankCode || form.accountNumber.length < 10) return;

    setResolving(true);
    const res = await fetch("/api/affiliate/resolve-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountNumber: form.accountNumber, bankCode: form.bankCode }),
    });
    const result = await res.json();
    setResolving(false);

    if (!res.ok) {
      setResolveError(result.error || "Could not verify this account.");
      return;
    }
    setAccountName(result.accountName);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!accountName) {
      setError("Please verify your bank account before continuing.");
      return;
    }

    setLoading(true);
    const selectedBank = banks.find((b) => b.code === form.bankCode);
    const res = await fetch("/api/affiliate/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, accountName, bankName: selectedBank?.name || "" }),
    });
    const result = await res.json();

    if (!res.ok) {
      setError(result.error || "Something went wrong.");
      setLoading(false);
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });
    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    router.push("/affiliate/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">
          Agrobuyer · Become an Affiliate
        </p>
        <h1 className="text-2xl font-semibold mb-2">Earn 30% per referral</h1>
        <p className="text-sm opacity-70 mb-6">
          Get your own link, onboard business owners, and earn 30% of their first subscription payment automatically.
        </p>

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
          placeholder="Phone (optional)"
          className="w-full bg-surface border border-white/10 rounded-md p-3"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
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

        <div className="pt-2 border-t border-white/10">
          <p className="text-xs uppercase tracking-widest opacity-60 mb-3 mt-3">Payout account</p>

          <select
            className="w-full bg-surface border border-white/10 rounded-md p-3 mb-3"
            value={form.bankCode}
            onChange={(e) => {
              setForm({ ...form, bankCode: e.target.value });
              setAccountName("");
            }}
            required
          >
            <option value="">Select your bank</option>
            {banks.map((b) => (
              <option key={b.code} value={b.code}>{b.name}</option>
            ))}
          </select>

          <input
            placeholder="Account number"
            className="w-full bg-surface border border-white/10 rounded-md p-3"
            value={form.accountNumber}
            onChange={(e) => {
              setForm({ ...form, accountNumber: e.target.value });
              setAccountName("");
            }}
            onBlur={handleResolveAccount}
            maxLength={10}
            required
          />

          {resolving && <p className="text-sm opacity-60 mt-2">Verifying account...</p>}
          {accountName && <p className="text-sm text-gold mt-2">✓ {accountName}</p>}
          {resolveError && <p className="text-rust text-sm mt-2">{resolveError}</p>}
        </div>

        {error && <p className="text-rust text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !accountName}
          className="w-full bg-gold text-ink font-semibold rounded-md p-3 disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Become an Affiliate"}
        </button>

        <p className="text-sm text-center opacity-70">
          Already an affiliate? <a href="/affiliate/login" className="text-gold underline">Log in</a>
        </p>
      </form>
    </main>
  );
}
