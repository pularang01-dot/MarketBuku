import { z } from "zod";

export const loginSchema = z.object({ email: z.string().email("Email tidak valid"), password: z.string().min(8, "Minimal 8 karakter") });
export const registerSchema = loginSchema.extend({ full_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80) });
export const forgotSchema = z.object({ email: z.string().email() });
export const resetSchema = z.object({ password: z.string().min(8, "Minimal 8 karakter") });

const coord = (min: number, max: number, msg: string) => z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().min(min, msg).max(max, msg).optional());

export const addressSchema = z.object({
  latitude: coord(-11.5, 6.5, "Titik peta di luar Indonesia"),
  longitude: coord(94.5, 141.5, "Titik peta di luar Indonesia"),
  recipient_name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^(\+62|62|0)8[0-9]{7,12}$/, "Nomor HP Indonesia tidak valid"),
  province: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2).max(60),
  district: z.string().trim().min(2).max(60),
  postal_code: z.string().regex(/^[0-9]{5}$/, "Kode pos 5 digit"),
  address_line: z.string().trim().min(8, "Alamat terlalu singkat").max(300),
});

export const checkoutSchema = z.object({
  address: addressSchema,
  shipping: z.string().regex(/^[A-Z0-9_-]+:[A-Z0-9_-]+$/i, "Pilih layanan pengiriman"),
  coupon: z.string().trim().toUpperCase().max(40).optional().or(z.literal("")),
});

export const reviewSchema = z.object({
  book_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().min(10, "Minimal 10 karakter").max(2000),
});

const money = z.coerce.number().int().min(0);
export const bookSchema = z.object({
  title: z.string().trim().min(3).max(200),
  isbn: z.string().trim().regex(/^(97[89])?[0-9]{9}[0-9Xx]$/, "ISBN tidak valid").optional().or(z.literal("")),
  description: z.string().trim().min(20, "Deskripsi minimal 20 karakter"),
  author_id: z.string().uuid().optional().or(z.literal("")),
  publisher_id: z.string().uuid().optional().or(z.literal("")),
  publication_year: z.coerce.number().int().min(1900).max(2100).optional(),
  pages: z.coerce.number().int().min(1).optional(),
  language: z.string().trim().default("Indonesia"),
  format: z.enum(["PRINT", "EBOOK", "MODULE"]),
  weight_gram: money.default(300),
  dimensions: z.string().trim().optional(),
  price: money,
  sale_price: money.optional(),
  education_level_id: z.string().uuid().optional().or(z.literal("")),
  grade_id: z.string().uuid().optional().or(z.literal("")),
  keywords: z.string().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  featured: z.coerce.boolean().default(false),
  stock: money.default(0),
}).refine((d) => d.sale_price == null || d.sale_price <= d.price, { message: "Harga diskon tidak boleh melebihi harga normal", path: ["sale_price"] });

export const stockSchema = z.object({
  book_id: z.string().uuid(),
  delta: z.coerce.number().int().refine((n) => n !== 0, "Perubahan tidak boleh 0"),
  type: z.enum(["restock", "adjustment", "return"]),
  note: z.string().trim().max(200).optional(),
});