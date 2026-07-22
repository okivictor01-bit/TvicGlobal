"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
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
          Agrobuyer
        </p>
        <h1 className="text-2xl font-semibold mb-6">Log in</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full bg-surface border border-white/10 rounded-md p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full bg-surface border border-white/10 rounded-md p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-rust text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gold text-ink font-semibold rounded-md p-3 disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
    </main>
  );
}
