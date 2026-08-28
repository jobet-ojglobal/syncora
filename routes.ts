
export const publicRoutes = [
    "/",
    "/about",
    "/contact",
    "/terms",
    "/privacy",
];

export const protectedRoutes = [
    "/dashboard",
    "/admin",
];

export const authRoutes = [
    "/sign-in",
    "/sign-up", 
    "/forgot-password",
    "/reset-password",
    "/verify-email"
];

export const apiAuthPrefix = "/api/auth";

export const DEFAULT_REDIRECT_PATH = "/dashboard";
