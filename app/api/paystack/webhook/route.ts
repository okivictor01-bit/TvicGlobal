import { NextResponse } from "next/server";
import crypto from "crypto";
import { verifyAndApply } from "@/lib/paystackServer";

// Configure this exact URL in the Paystack dashboard:
// Settings -> API Keys & Webhooks -> Webhook URL
//   https://tvic-global.vercel.app/api/paystack/webhook
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  const expectedHash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");

  if (expectedHash !== signature) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === "charge.success") {
    await verifyAndApply(event.data.reference);
  }

  return NextResponse.json({ received: true });
}
