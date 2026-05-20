import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute   = pathname.startsWith("/login") || pathname.startsWith("/signup");
  // Routes that beta-gated users are allowed to reach
  const isBetaExempt  =
    isAuthRoute ||
    pathname.startsWith("/pending") ||
    pathname.startsWith("/denied")  ||
    pathname.startsWith("/api/")    ||
    pathname.startsWith("/admin");

  // Helper: build a redirect response that carries any refreshed session cookies
  // from supabaseResponse (set by getUser() above). Without this, a token refresh
  // that happened during getUser() would be lost when we return a plain redirect.
  function redirectWithCookies(destination: string) {
    const res = NextResponse.redirect(new URL(destination, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie);
    });
    return res;
  }

  // Redirect unauthenticated users to login
  if (!user && !isAuthRoute) {
    return redirectWithCookies("/login");
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    return redirectWithCookies("/home");
  }

  // Beta-access gate: check the user's beta_status on protected routes
  if (user && !isBetaExempt) {
    const { data: profile } = await supabase
      .from("users")
      .select("beta_status")
      .eq("id", user.id)
      .single();

    const status = profile?.beta_status ?? "approved";

    if (status === "pending") return redirectWithCookies("/pending");
    if (status === "denied")  return redirectWithCookies("/denied");
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
