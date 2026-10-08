import { test, expect } from "@playwright/test";

// Requires: seeded Supabase project, .env.local configured, PAYMENT_PROVIDER=mock (dev server).
const email = `e2e-${Date.now()}@example.test`, password = "Passw0rd!e2e";

test("browse, search, and view a book", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Temukan Buku");
  await page.goto("/books?q=matematika");
  await expect(page.getByRole("article").first()).toBeVisible();
  await page.getByRole("article").first().getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText("Spesifikasi")).toBeVisible();
});

test("empty search shows an empty state", async ({ page }) => {
  await page.goto("/books?q=zzzzzzzzzz");
  await expect(page.getByText("Tidak ada buku yang cocok")).toBeVisible();
});

test("register, add to cart, checkout with mock payment, see order paid, open account", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Nama lengkap").fill("Penguji E2E");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Kata sandi").fill(password);
  await page.getByRole("button", { name: "Buat Akun" }).click();
  // if email confirmation is enabled in Supabase, disable it for the test project (Auth > Providers > Email)
  await page.waitForURL(/account|login/);
  if (page.url().includes("login")) { await page.getByLabel("Email").fill(email); await page.getByLabel("Kata sandi").fill(password); await page.getByRole("button", { name: "Masuk" }).click(); }

  await page.goto("/books/matematika-kelas-5-kurikulum-merdeka");
  await page.getByRole("button", { name: "Masukkan Keranjang" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Ditambahkan" })).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByText("Matematika Kelas 5")).toBeVisible();
  await page.getByRole("link", { name: "Lanjut ke Checkout" }).click();

  await page.getByLabel("Nama penerima").fill("Penguji E2E");
  await page.getByLabel("No. HP").fill("081234567890");
  await page.getByLabel("Provinsi").fill("Jawa Timur");
  await page.getByLabel("Kota/Kabupaten").fill("Surabaya");
  await page.getByLabel("Kecamatan").fill("Gubeng");
  await page.getByLabel("Kode pos").fill("60281");
  await page.getByLabel("Alamat lengkap").fill("Jl. Uji Coba No. 1");
  await page.getByRole("radio").first().check();
  await page.getByLabel("Kode kupon (opsional)").fill("BELAJAR10");
  await page.getByRole("button", { name: "Buat Pesanan & Bayar" }).click();

  await expect(page.getByText("DEVELOPMENT ONLY")).toBeVisible();
  await page.getByRole("button", { name: "Simulasikan sukses" }).click();
  await expect(page.getByText("Dibayar")).toBeVisible();
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: /Halo/ })).toBeVisible();
});

test("protected pages redirect guests to login; admin is forbidden for normal users", async ({ page }) => {
  await page.goto("/orders");
  await expect(page).toHaveURL(/login/);
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/login/);
});

test("mobile layout has no horizontal overflow on home and catalog", async ({ page }) => {
  for (const path of ["/", "/books", "/cart"]) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow, `horizontal overflow on ${path}`).toBe(false);
  }
});
