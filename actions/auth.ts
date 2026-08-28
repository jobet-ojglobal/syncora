"use server";
import { auth } from "@/auth"

export const signIn = async () => {
  await auth.api.signInEmail({
    body: {
      email: "user@email.com",
      password: "password",
    }
  })
}