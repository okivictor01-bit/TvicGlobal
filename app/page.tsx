export default function Home() {
  return (
    <>
      <main
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(rgba(20,17,15,0.80), rgba(20,17,15,0.85)), url('/hero.jpg')" }}
      >
        <img src="/agrobuyer-icon.svg" alt="Agrobuyer" width="64" height="64" className="mb-4" />
        <p className="font-mono text-xs tracking-widest text-gold uppercase mb-3">
          Agrobuyer
        </p>
        <h1 className="text-3xl font-semibold mb-4 max-w-md text-[#F1EAD9]">
          Stop Losing Money to Manual Records. Manage Every Kilogram, Every Payment, Every Profit in One Place.
        </h1>
        <p className="text-sm max-w-sm mb-10 text-[#F1EAD9] opacity-80">
          The complete farm produce procurement and accounting system that automates farmer advances, weight-based purchases, quality deductions, inventory, exporter sales, and financial reporting—giving you accurate records, faster operations, and total control over your business.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <a href="/login" className="block w-full bg-gold text-ink font-semibold rounded-md p-3">
            Log In
          </a>
          <a href="/signup" className="block w-full border border-[#F1EAD9]/40 text-[#F1EAD9] rounded-md p-3">
            Sign Up
          </a>
        </div>

        <div className="flex gap-4 mt-10 text-xs text-[#F1EAD9] opacity-70">
          <a href="/faq" className="underline">FAQ</a>
          <a href="/contact" className="underline">Contact</a>
        </div>
      </main>

      <section className="bg-ink px-6 py-16">
        <div className="max-w-2xl mx-auto space-y-6 text-[#F1EAD9]">
          <p className="opacity-90 leading-relaxed">
            Running a produce business shouldn't mean spending hours balancing books, chasing records, or arguing over payments.
          </p>
          <p className="opacity-90 leading-relaxed">
            Our Farm Produce Procurement & Accounting System is built for companies that buy directly from customers/farmers and sell to exporters. From customer registration and advance payments to weight recording, quality grading, inventory management, sales, and financial reporting, every transaction is captured in one secure platform.
          </p>
          <p className="opacity-90 leading-relaxed">
            The system automatically calculates payments based on{" "}
            <strong className="text-gold font-semibold">weight, quality deductions, outstanding advances, and current buying prices</strong>
            , eliminating manual errors and saving valuable time. Whether you're buying cocoa, palm kernel, sesame, cashew, or other agricultural produce, you'll always know your stock levels, cash flow, farmer balances, and business performance in real time.
          </p>
          <p className="opacity-90 leading-relaxed">
            With role-based access for owners, managers, secretaries, and workers, everyone works from the same accurate records—no more duplicate bookkeeping or stressful account reconciliation.
          </p>
          <p className="opacity-90 leading-relaxed">
            Make smarter decisions, build trust with customers/farmers, and grow your business with a modern solution designed specifically for agricultural produce trading.
          </p>
        </div>
      </section>
    </>
  );
}
