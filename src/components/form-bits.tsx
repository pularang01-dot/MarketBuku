"use client";
import type { ActionState } from "@/types";
import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={className}>{pending ? "Memproses..." : children}</button>;
}
export function Msg({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return <p role={state.ok ? "status" : "alert"} className={`rounded-ctl px-3 py-2 text-sm ${state.ok ? "bg-leaf-light text-leaf" : "bg-danger-light text-danger"}`}>{state.message}</p>;
}
export function Field({ name, label, state, type = "text", ...rest }: { name: string; label: string; state: ActionState; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const err = state?.errors?.[name]?.[0];
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} type={type} className="input" aria-invalid={!!err} aria-describedby={err ? `${name}-e` : undefined} {...rest} />
      {err && <p id={`${name}-e`} className="field-error">{err}</p>}
    </div>
  );
}