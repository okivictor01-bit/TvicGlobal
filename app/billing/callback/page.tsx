"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function BillingCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"checking" | "success" | "failed">("checking");

  useEffect(() => {
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) {
      setStatus("failed");
      return;
    }
    verify(reference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(reference: string) {
    const res = await fetch("/api/paystack/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    const result = await res.json();
    setStatus(res.ok && result.status === "success" ? "success" : "failed");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-4">Agrobuyer</p>

      {status === "checking" && <p>Confirming your payment...</p>}

      {status === "success" && (
        <>
          <p className="text-lg font-semibold mb-4">Payment confirmed. You are all set!</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gold text-ink font-semibold px-4 py-2 rounded-md"
          >
            Go to Dashboard
          </button>
        </>
      )}

      {status === "failed" && (
        <>
          <p className="text-lg font-semibold mb-4 text-rust">We could not confirm this payment.</p>
          <button
            onClick={() => router.push("/billing")}
            className="bg-gold text-ink font-semibold px-4 py-2 rounded-md"
          >
            Try Again
          </button>
        </>
      )}
    </main>
  );
}

export default function BillingCallback() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center">Loading...</main>}>
      <BillingCallbackInner />
    </Suspense>
  );
}
