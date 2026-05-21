import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Rutas solo para administradores
    if (
      (pathname.startsWith("/dashboard") || pathname.startsWith("/users")) &&
      token?.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/users/:path*",
    "/profile/:path*",
    "/absences/:path*",
  ],
};
