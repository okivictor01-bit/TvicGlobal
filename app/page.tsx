export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-3">
        Agrobuyer
      </p>
      <h1 className="text-3xl font-semibold mb-4 max-w-md">
        Run your produce buying business from your phone
      </h1>
      <p className="text-sm opacity-70 max-w-sm mb-10">
        Multi-branch purchasing, farmer advances, inventory, and sales to
        exporters — all in one place, with a receipt for every transaction.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <a href="/login" className="block w-full bg-gold text-ink font-semibold rounded-md p-3">
          Log In
        </a>
        <a href="/signup" className="block w-full border border-white/10 rounded-md p-3">
          Sign Up
        </a>
      </div>

      <div className="flex gap-4 mt-10 text-xs opacity-60">
        <a href="/faq" className="underline">FAQ</a>
        <a href="/contact" className="underline">Contact</a>
      </div>
    </main>
  );
}
