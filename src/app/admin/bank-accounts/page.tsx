import { redirect } from "next/navigation";
export default function BankAccountsRedirect() { redirect("/admin/payments?tab=banks"); }