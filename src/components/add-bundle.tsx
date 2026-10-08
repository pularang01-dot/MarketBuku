"use client";
import { useState, useTransition } from "react";
import { addToCart } from "@/actions/cart";
export function AddBundle({ ids }: { ids: string[] }) {
  const [p, start] = useTransition(); const [m, setM] = useState("");
  return (<><button className="btn-accent" disabled={p} onClick={() => start(async () => { for (const id of ids) await addToCart(id, 1); setM("Semua buku paket ditambahkan ke keranjang."); })}>{p ? "Menambahkan..." : "Tambahkan Paket ke Keranjang"}</button><p role="status" className="mt-2 text-sm text-leaf">{m}</p></>);
}
