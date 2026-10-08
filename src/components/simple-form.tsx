"use client";
import { useActionState } from "react";
import type { ActionState } from "@/types";
import { Field, Msg, Submit } from "./form-bits";

export interface FieldDef { name: string; label: string; type?: string; defaultValue?: string; required?: boolean; placeholder?: string }
/** Generic client form wrapper for server actions with plain text fields. */
export function SimpleForm({ action, fields, cta, children }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; fields: FieldDef[]; cta: string; children?: React.ReactNode }) {
  const [state, run] = useActionState(action, null);
  return (
    <form action={run} className="card space-y-3 p-4">
      {fields.map((f) => <Field key={f.name} state={state} {...f} />)}
      {children}<Msg state={state} /><Submit>{cta}</Submit>
    </form>
  );
}
