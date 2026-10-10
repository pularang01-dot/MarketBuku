import { Check } from "lucide-react";
import { PHASE_LABEL, PHASE_TONE, type PaymentPhase, type TimelineStep } from "@/lib/payment-state";

export function PaymentBadge({ phase }: { phase: PaymentPhase }) {
  return <span className={`badge ${PHASE_TONE[phase]}`}>{PHASE_LABEL[phase]}</span>;
}

/** Vertical timeline. State is conveyed by an icon and text label, not by colour alone. */
export function PaymentTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-3" aria-label="Tahapan pesanan">
      {steps.map((s) => (
        <li key={s.key} className="flex items-start gap-3" aria-current={s.state === "current" ? "step" : undefined}>
          <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-pill border-2 text-xs font-bold ${s.state === "done" ? "border-leaf bg-leaf text-white" : s.state === "current" ? "border-brand bg-white text-brand" : "border-line bg-white text-ink-mute"}`}>
            {s.state === "done" ? <Check aria-hidden className="h-3.5 w-3.5" /> : s.state === "current" ? "•" : ""}
          </span>
          <span className="min-w-0">
            <span className={`block text-sm ${s.state === "upcoming" ? "text-ink-mute" : "font-semibold text-ink"}`}>{s.label}
              <span className="sr-only"> — {s.state === "done" ? "selesai" : s.state === "current" ? "tahap saat ini" : "belum"}</span></span>
            {s.at && <span className="block text-xs text-ink-mute">{new Date(s.at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}