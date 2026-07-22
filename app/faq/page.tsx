const faqs = [
  {
    q: "What is Agrobuyer?",
    a: "Agrobuyer is a platform for produce buying businesses. It handles farmer purchases with quality-adjusted pricing, farmer advances, multi-branch operations, inventory, and sales to exporters, with a digital receipt generated for every purchase.",
  },
  {
    q: "How does the free trial work?",
    a: "Every new business gets a 7-day free trial with full access to every feature. No card is required to start. After 7 days, the business owner subscribes to a plan to keep using the platform.",
  },
  {
    q: "What are the pricing options?",
    a: "Agrobuyer has one flat plan across four billing periods: NGN 5,000 monthly, NGN 14,000 for 3 months, NGN 25,000 for 6 months, or NGN 45,000 for a full year. Longer periods work out cheaper per month.",
  },
  {
    q: "How do I pay?",
    a: "Payments are handled securely through Paystack, supporting cards, bank transfer, and USSD. Only the business owner can manage billing and choose a plan, from the Billing page.",
  },
  {
    q: "What happens if my subscription expires?",
    a: "Access locks until the business owner renews. Staff members will see a message asking them to contact the owner, and the owner will see a Subscribe button. No data is lost while access is locked.",
  },
  {
    q: "Can I run multiple branches?",
    a: "Yes. A business can have any number of branches, each with its own staff and purchases, while the owner sees consolidated reports and inventory across all branches from one account.",
  },
  {
    q: "What is the difference between owner, manager, secretary, and worker roles?",
    a: "The owner has full access, including billing, branches, staff, and reports. Managers oversee their branch, including staff and inventory. Secretaries record purchases and manage farmers. Worker access is limited to day-to-day recording tasks assigned by a manager.",
  },
  {
    q: "Is my business data private?",
    a: "Yes. Each business is fully isolated from every other business on the platform. Staff can only see data that belongs to their own business, and in most cases, their own branch.",
  },
  {
    q: "I still have a question. Who do I contact?",
    a: "Reach out any time by email at tvicglobal@gmail.com or on WhatsApp at 0803 528 9512.",
  },
];

export default function Faq() {
  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">
        Agrobuyer
      </p>
      <h1 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h1>

      <div className="space-y-4">
        {faqs.map((item, i) => (
          <div key={i} className="border border-white/10 rounded-lg p-4">
            <p className="font-semibold text-sm mb-2">{item.q}</p>
            <p className="text-sm opacity-70">{item.a}</p>
          </div>
        ))}
      </div>

      <a href="/contact" className="text-xs text-gold underline mt-8 inline-block">
        Still need help? Contact us
      </a>
    </main>
  );
}
