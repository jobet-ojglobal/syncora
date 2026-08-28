// components/providers/auth-provider.tsx
"use client";

import { authClient } from "@/auth-client";
import { createContext, useContext, ReactNode } from "react";

// Define what our context will actually expose to components
interface AuthContextType {
  signIn: typeof authClient.signIn;
  signOut: typeof authClient.signOut;
  signInCred: typeof authClient.signIn.email; // Maps to better-auth's email/password handler
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { signIn, signOut } = authClient;
  const signInCred = authClient.signIn.email;

  return (
    <AuthContext.Provider value={{ signIn, signOut, signInCred }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};