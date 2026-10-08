import { NextResponse } from "next/server";
import { processPaymentWebhook } from "@/lib/payments/webhook";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const raw = await req.text();
  try {
    const result = await processPaymentWebhook(raw, req.headers);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "NOT_SUPPORTED") return NextResponse.json({ error: "not found" }, { status: 404 }); // manual mode has no gateway webhook
    if (msg === "INVALID_SIGNATURE") return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    console.error("[webhook]", e);
    return NextResponse.json({ error: "processing failed" }, { status: 500 }); // provider will retry
  }
}