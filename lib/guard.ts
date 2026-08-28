import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@/generated/prisma/enums";

export async function requireAuth() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect("/sign-in");
    }

    return session;
}

export async function requireRole(
    allowedRoles: UserRole[]
) {
    const session = await requireAuth();

    const userRole = session.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
        redirect("/unauthorized");
    }

    return session;
}

export async function requireAdmin() {
    return requireRole(["Admin"]);
}

export async function requireStoreManager() {
    return requireRole(["TeamMember"]);
}

export async function requireCustomer() {
    return requireRole(["Customer"]);
}

export async function requireStoreAccess() {
    return requireRole([
        "Admin",
        "TeamMember",
    ]);
}
