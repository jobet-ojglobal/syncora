// src/proxy.ts
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { authRoutes, DEFAULT_REDIRECT_PATH, protectedRoutes } from "./routes";

export async function proxy(request: NextRequest) {
    const { nextUrl } = request;
    const session = await auth.api.getSession({
        headers: await headers()
    });

    const isAuthRoute = authRoutes.includes(nextUrl.pathname);
    const isProtectedRoute = protectedRoutes.some(route => 
        nextUrl.pathname.startsWith(route)
    );

    // Case 1: User is logged in and tries to access an Auth Route (sign-in, sign-up, etc.)
    if (session && isAuthRoute) {
        return NextResponse.redirect(new URL(DEFAULT_REDIRECT_PATH, nextUrl));
    }

    // Case 2: User is NOT logged in and tries to access a Protected Route
    if (!session && isProtectedRoute) {
        const callbackUrl = encodeURIComponent(`${nextUrl.pathname}${nextUrl.search}`);
        
        return NextResponse.redirect(
            new URL(`/login?callbackUrl=${callbackUrl}`, nextUrl)
        );
    }

    return NextResponse.next();
}

export const config = {
    // It's better to use a regex or your protectedRoutes list here
    matcher: ["/admin/:path*", "/profile/:path*", "/settings/:path*", "/((?!api|_next/static|_next/image|favicon.ico).*)"], 
};