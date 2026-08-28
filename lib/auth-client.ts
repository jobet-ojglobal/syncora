// lib\auth-client.ts
import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields, usernameClient } from "better-auth/client/plugins";
import { auth } from "./auth";

export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    plugins: [
        inferAdditionalFields<typeof auth>(),
        usernameClient() 
    ],
    baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", 
})
/**
 * Handles social sign-in for any supported provider
 * @param provider - 'google', 'github', 'discord', etc.
 * @param callbackUrl - Where to redirect after successful login
 */
export const signInWithSocial = async (
  provider: "google" | "github" | "discord" | string, 
  callbackUrl: string = "/dashboard"
) => {
  try {
    await authClient.signIn.social({
      provider: provider,
      callbackURL: callbackUrl,
    });
  } catch (error) {
    console.error(`${provider} sign-in error:`, error);
    // You could trigger a toast notification here
    throw error;
  }
};

// Example of a sign-out function that can be called from your components
export const signOut = async () => {
  await authClient.signOut();
};

