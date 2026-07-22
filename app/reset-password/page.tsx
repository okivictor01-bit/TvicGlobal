
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">
          Agrobuyer
        </p>
        <h1 className="text-2xl font-semibold mb-6">Set a new password</h1>

        {success ? (
          <p className="text-olive">Password updated! Redirecting to login...</p>
        ) : (
          <>
            <input
              type="password"
              placeholder="New password"
              className="w-full bg-surface border border-white/10 rounded-md p-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && <p className="text-rust text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-ink font-semibold rounded-md p-3 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}
