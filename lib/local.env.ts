// lib/local.env.ts

function required(name: string, fallbackForBuild?: string) {
  const value = process.env[name];

  if (!value) {
    // If Next.js is gathering page data during 'next build' or running in docker assembly
    const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build" || process.env.NODE_ENV === "production";

    if (isBuildPhase && fallbackForBuild) {
      return fallbackForBuild;
    }

    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export const env = {
  // Safe stubs so Next.js can bundle its server code without a hiccup
  PARTNER_API_URL: required(
    "PARTNER_API_URL",
    "https://build-placeholder.local"
  ),
  PARTNER_API_KEY: required(
    "PARTNER_API_KEY",
    "build_placeholder_key"
  ),
  SITE_URL: required(
    "SITE_URL",
    "http://localhost:3000"
  ),
};