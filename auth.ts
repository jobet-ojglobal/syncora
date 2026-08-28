// lib\auth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "./lib/prisma";

export const auth = betterAuth({
  appName: "Syncora",
  database: prismaAdapter(prisma, {
      provider: "postgresql",
  }),
  advanced: {
    database: {
      joins: true,
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "Customer",
        input: false, // Prevents user from setting this during sign-up
      },
      locationId: {
        type: "string",
        required: false,
        defaultValue: null,
        input: false, // Prevents user from setting this during sign-up
      },
    },
  },
  emailAndPassword: {
    enabled: true, 
  }, 
  disabledPaths: ["/is-username-available"],
  
  baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000", 
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  plugins: [ 
    username({
      usernameNormalization: (username) => {
        return username.toLowerCase()
          .replaceAll("0", "o")
          .replaceAll("3", "e")
          .replaceAll("4", "a");
      }
    }),
    nextCookies(),
  ],
  trustedOrigins: ["http://localhost:3000"], 
});

