export default function Contact() {
  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-3">
        Agrobuyer
      </p>
      <h1 className="text-2xl font-semibold mb-3">Get in Touch</h1>
      <p className="text-sm opacity-70 mb-8 max-w-sm">
        Questions about your account, billing, or how Agrobuyer works?
        Reach us directly.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <a
          href="mailto:tvicglobal@gmail.com"
          className="block w-full border border-white/10 rounded-md p-4"
        >
          <p className="text-xs opacity-60 mb-1">Email</p>
          <p className="font-mono text-sm text-gold">tvicglobal@gmail.com</p>
        </a>

        <a
          href="https://wa.me/2348035289512"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-gold text-ink rounded-md p-4"
        >
          <p className="text-xs opacity-70 mb-1">WhatsApp</p>
          <p className="font-mono text-sm font-semibold">0803 528 9512</p>
        </a>
      </div>

      <a href="/faq" className="text-xs text-gold underline mt-10">
        Looking for answers? Check the FAQ
      </a>
    </main>
  );
}
