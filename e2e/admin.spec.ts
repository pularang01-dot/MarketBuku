import { test, expect } from "@playwright/test";

// Requires E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD of an account whose profiles.role = 'ADMIN'.
const { E2E_ADMIN_EMAIL: email, E2E_ADMIN_PASSWORD: password } = process.env;
test.skip(!email || !password, "set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");

test("admin can sign in and reach dashboard, books, inventory, orders", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Kata sandi").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  for (const [path, heading] of [["/admin/dashboard", "Dashboard"], ["/admin/books", "Buku"], ["/admin/inventory", "Inventori"], ["/admin/orders", "Pesanan"], ["/admin/coupons", "Kupon"]] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});

test("admin can create a taxonomy item and a draft book", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email!); await page.getByLabel("Kata sandi").fill(password!);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.goto("/admin/subjects");
  const name = `Mapel Uji ${Date.now()}`;
  await page.getByLabel("Nama baru").fill(name);
  await page.getByRole("button", { name: "Tambah" }).click();
  await expect(page.getByText("Tersimpan.")).toBeVisible();
  await page.goto("/admin/books/new");
  await page.getByLabel("Judul").fill(`Buku Uji ${Date.now()}`);
  await page.getByLabel("Deskripsi").fill("Deskripsi buku uji yang cukup panjang untuk validasi.");
  await page.getByLabel("Harga (Rp)").fill("50000");
  await page.getByRole("button", { name: "Simpan Buku" }).click();
  await expect(page).toHaveURL(/admin\/books$/);
});
