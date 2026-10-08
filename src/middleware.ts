import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED = ["/checkout", "/orders", "/order", "/account", "/wishlist", "/library", "/reader", "/admin"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const path = request.nextUrl.pathname;
  if (!user && PROTECTED.some((p) => path === p || path.startsWith(p + "/"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  return response; // role checks for /admin happen server-side in requireAdmin()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/payments/webhook|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};
