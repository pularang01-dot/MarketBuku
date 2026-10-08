import { redirect } from "next/navigation";
export default async function OrderAlias({ params }: { params: Promise<{ id: string }> }) { redirect(`/orders/${(await params).id}`); }
